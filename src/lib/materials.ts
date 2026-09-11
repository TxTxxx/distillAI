import type { Session, Source } from "../types";
import { uid } from "../types";
import { storage } from "./storage";
import { safeUrl } from "./api";
export async function importFile(file: File, label: string): Promise<Source> {
  if (file.size > 30 * 1024 * 1024)
    throw new Error("单个文件请控制在 30 MB 以内。");
  if (!/\.pdf$/i.test(file.name)) {
    if (!/\.(txt|md)$/i.test(file.name))
      throw new Error("支持 PDF、Markdown 和 TXT 文件。");
    return {
      id: uid(),
      label,
      title: file.name,
      kind: "text",
      evidence: "provided",
      text: await file.text(),
    };
  }
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const loading = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const pdf = await loading.promise;
  const pages: NonNullable<Source["pages"]> = [];
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const p = await pdf.getPage(n);
      const content = await p.getTextContent();
      pages.push({
        page: n,
        text: content.items
          .map((i) =>
            "str" in i ? i.str + ("hasEOL" in i && i.hasEOL ? "\n" : " ") : "",
          )
          .join(""),
      });
    }
  } finally {
    await loading.destroy();
  }
  const blobId = uid();
  await storage.asset(blobId, file);
  const text = pages.map((p) => `[第 ${p.page} 页]\n${p.text}`).join("\n\n");
  const readable = pages.some((p) => p.text.trim().length > 0);
  return {
    id: uid(),
    label,
    title: file.name,
    kind: "pdf",
    evidence: readable ? "extracted" : "unread",
    text,
    pages,
    blobId,
    warning: readable
      ? "已提取文字；图表、公式与多栏排版可能不完整，请对照原页。"
      : "无法提取有效正文，可能是扫描件。请加入可复制的文字材料；此文件不会作为已读全文。",
  };
}
export async function importLink(
  url: string,
  label: string,
  signal?: AbortSignal,
): Promise<Source> {
  const safe = safeUrl(url);
  if (!safe) throw new Error("请输入有效的 HTTP 或 HTTPS 论文链接。");
  const result: Source = {
    id: uid(),
    label,
    title: new URL(safe).hostname,
    url: safe,
    kind: "web",
    evidence: "unread",
    text: "",
    warning: "尚未读取正文。可开启联网查找资料，或上传 PDF / 粘贴正文。",
  };
  try {
    const response = await fetch(safe, {
      signal: signal ?? AbortSignal.timeout(15_000),
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (!response.ok) return result;
    const type = response.headers.get("content-type") ?? "";
    if (type.includes("pdf")) {
      const blob = await response.blob();
      const source = await importFile(
        new File(
          [blob],
          (new URL(safe).pathname.split("/").pop() || "paper") + ".pdf",
          { type: "application/pdf" },
        ),
        label,
      );
      return { ...source, url: safe };
    }
    if (type.includes("text/html")) {
      const doc = new DOMParser().parseFromString(
        await response.text(),
        "text/html",
      );
      doc
        .querySelectorAll("script,style,nav,header,footer,aside")
        .forEach((x) => x.remove());
      const text =
        (doc.querySelector("article,main") ?? doc.body).textContent?.trim() ??
        "";
      if (text.length > 300)
        return {
          ...result,
          title: doc.title || result.title,
          evidence: "extracted",
          text: text.slice(0, 200_000),
          warning:
            text.length > 200_000
              ? "正文较长，保留前 200,000 字符。"
              : undefined,
        };
    }
  } catch {
    /* Cross-origin denial is an explicit unread source, never a fabricated read. */
  }
  return result;
}
export function sourceContext(
  session: Session,
  query: string,
  budget = 24000,
): string {
  const terms =
    query.toLowerCase().match(/[a-z][a-z0-9-]{2,}|[\u4e00-\u9fff]{2,6}/g) ?? [];
  const chunks = session.sources
    .filter((s) => s.evidence !== "unread")
    .flatMap((s) => {
      const pages = s.pages ?? [{ page: 0, text: s.text }];
      return pages.flatMap((p) => {
        const out: { text: string; score: number }[] = [];
        for (let i = 0; i < p.text.length; i += 2000) {
          const text = p.text.slice(i, i + 2400);
          const score =
            terms.reduce(
              (n, w) => n + (text.toLowerCase().includes(w) ? 1 : 0),
              0,
            ) + (i === 0 ? 0.5 : 0);
          out.push({
            text: `[${s.label}${p.page ? `:${p.page}` : ""}] ${s.title}（${s.evidence === "search" ? "搜索摘要，非全文" : s.evidence === "provided" ? "用户提供材料" : "提取正文"}）\n${text}`,
            score,
          });
        }
        return out;
      });
    });
  let text = "";
  for (const c of chunks.sort((a, b) => b.score - a.score)) {
    if (text.length + c.text.length > budget) continue;
    text += c.text + "\n\n";
  }
  return (
    text || "暂无可读取资料。只能讨论一般原理；具体论文数据与结论须标为待核实。"
  );
}
