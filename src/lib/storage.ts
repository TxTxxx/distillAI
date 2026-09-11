import { openDB } from "idb";
import { defaults } from "../types";
import type { Session, Settings } from "../types";
const database = () =>
  openDB("guanyan", 1, {
    upgrade(db) {
      db.createObjectStore("sessions", { keyPath: "id" });
      db.createObjectStore("settings");
      db.createObjectStore("assets");
    },
  });
export const storage = {
  async sessions(): Promise<Session[]> {
    return (await (await database()).getAll("sessions")).sort(
      (a: Session, b: Session) => b.updatedAt - a.updatedAt,
    );
  },
  async save(session: Session) {
    await (await database()).put("sessions", session);
  },
  async remove(id: string) {
    const db = await database();
    const s: Session | undefined = await db.get("sessions", id);
    await db.delete("sessions", id);
    if (s)
      for (const source of s.sources)
        if (source.blobId) await db.delete("assets", source.blobId);
    const keys = await db.getAllKeys("assets");
    for (const key of keys)
      if (String(key).startsWith(`audio:${id}:`))
        await db.delete("assets", key);
  },
  async asset(id: string, blob?: Blob): Promise<Blob | undefined> {
    const db = await database();
    if (blob) {
      await db.put("assets", blob, id);
      return blob;
    }
    return db.get("assets", id);
  },
  async clearAudio() {
    const db = await database();
    for (const key of await db.getAllKeys("assets"))
      if (String(key).startsWith("audio:")) await db.delete("assets", key);
  },
  async saveSettings(settings: Settings) {
    await (
      await database()
    ).put("settings", publicSettings(settings), "config");
  },
  async settings(): Promise<Settings> {
    const value = await (await database()).get("settings", "config");
    if (!value) return structuredClone(defaults);
    return {
      ...structuredClone(defaults),
      ...value,
      profiles: { ...structuredClone(defaults.profiles), ...value.profiles },
      voice: { ...defaults.voice, ...value.voice, key: "" },
    };
  },
};
export function publicSettings(s: Settings): Settings {
  return {
    ...s,
    profiles: Object.fromEntries(
      Object.entries(s.profiles).map(([k, c]) => [k, { ...c, key: "" }]),
    ) as Settings["profiles"],
    voice: { ...s.voice, key: "" },
  };
}
export function backup(session: Session) {
  return JSON.stringify({ app: "guanyan", version: 1, session }, null, 2);
}
export function restore(raw: string): Session {
  const value = JSON.parse(raw);
  if (value.app !== "guanyan" || value.version !== 1)
    throw new Error("这不是受支持的观研备份文件。");
  const s = value.session as Session;
  if (
    !s ||
    typeof s.id !== "string" ||
    typeof s.title !== "string" ||
    !["research", "interview"].includes(s.mode) ||
    !Array.isArray(s.turns) ||
    !Array.isArray(s.tutor) ||
    !Array.isArray(s.sources) ||
    !Array.isArray(s.roles) ||
    s.roles.length !== 2 ||
    !Number.isInteger(s.rounds) ||
    s.rounds < 1 ||
    s.rounds > 100 ||
    typeof s.notes !== "string" ||
    !Array.isArray(s.bookmarks) ||
    !Array.isArray(s.pendingQuestions)
  )
    throw new Error("备份结构不完整，无法恢复。");
  for (const turn of s.turns)
    if (
      typeof turn.id !== "string" ||
      typeof turn.text !== "string" ||
      ![0, 1].includes(turn.speaker) ||
      !Array.isArray(turn.citations)
    )
      throw new Error("备份中的对话格式无效。");
  for (const item of s.tutor)
    if (
      typeof item.id !== "string" ||
      typeof item.text !== "string" ||
      !["user", "assistant"].includes(item.role) ||
      !Array.isArray(item.snapshotIds) ||
      !Array.isArray(item.citations)
    )
      throw new Error("备份中的助教记录格式无效。");
  for (const source of s.sources)
    if (
      typeof source.id !== "string" ||
      typeof source.label !== "string" ||
      typeof source.text !== "string" ||
      typeof source.title !== "string" ||
      (source.pages &&
        !source.pages.every(
          (p) => Number.isInteger(p.page) && typeof p.text === "string",
        ))
    )
      throw new Error("备份中的资料格式无效。");
  for (const role of s.roles)
    if (typeof role.name !== "string" || typeof role.duty !== "string")
      throw new Error("备份中的角色格式无效。");
  // Reconstruct allowlisted fields: unknown properties (including credentials) never enter storage.
  return {
    id: crypto.randomUUID(),
    title: s.title,
    mode: s.mode,
    createdAt: s.createdAt,
    updatedAt: Date.now(),
    rounds: s.rounds,
    roles: s.roles.map((r) => ({
      name: r.name,
      duty: r.duty,
    })) as Session["roles"],
    turns: s.turns.map((t) => ({
      id: t.id,
      speaker: t.speaker,
      text: t.text,
      status: t.status === "complete" ? "complete" : "interrupted",
      createdAt: t.createdAt,
      citations: t.citations.map((c) => ({ url: c.url, title: c.title })),
      usage: t.usage,
    })),
    tutor: s.tutor.map((m) => ({
      id: m.id,
      role: m.role,
      text: m.text,
      status: m.status === "complete" ? "complete" : "interrupted",
      anchorId: m.anchorId,
      quote: m.quote,
      snapshotIds: m.snapshotIds,
      citations: m.citations.map((c) => ({ url: c.url, title: c.title })),
    })),
    sources: s.sources.map((x) => ({
      id: x.id,
      label: x.label,
      title: x.title,
      kind: x.kind,
      evidence: x.evidence,
      url: x.url,
      text: x.text,
      pages: x.pages?.map((p) => ({ page: p.page, text: p.text })),
      warning:
        x.kind === "pdf"
          ? "备份保留了提取文字，原 PDF 文件需重新加入。"
          : x.warning,
    })),
    notes: s.notes,
    bookmarks: s.bookmarks.filter((x) => typeof x === "string"),
    pendingQuestions: s.pendingQuestions
      .filter((q) => typeof q.id === "string" && typeof q.text === "string")
      .map((q) => ({ id: q.id, text: q.text })),
    summary: typeof s.summary === "string" ? s.summary : "",
    summaryThrough: Number.isInteger(s.summaryThrough) ? s.summaryThrough : 0,
    search: !!s.search,
    voice: !!s.voice,
    demo: !!s.demo,
  };
}
export function markdown(s: Session) {
  return `# ${s.title}\n\n${s.demo ? "**示例会话，非真实模型输出**\n\n" : ""}## 学习笔记\n\n${s.notes || "暂无笔记"}\n\n## 主讨论\n\n${s.turns.map((t) => `### ${s.roles[t.speaker].name}\n\n${t.text}\n\n${t.citations.map((c) => `- [${c.title}](${c.url})`).join("\n")}`).join("\n\n")}\n\n## 私人助教\n\n${s.tutor.map((t) => `### ${t.role === "user" ? "我的问题" : "助教"}${t.anchorId ? `（关联发言 ${t.anchorId}）` : ""}\n\n${t.quote ? `> ${t.quote}\n\n` : ""}${t.text}`).join("\n\n")}\n\n## 资料\n\n${s.sources.map((x) => `### ${x.label} · ${x.title}\n\n${x.url ?? ""}\n${x.warning ?? ""}\n\n${x.text}`).join("\n\n")}`;
}
export function download(name: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
