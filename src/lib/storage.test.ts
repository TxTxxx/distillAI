import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { defaults, newSession } from "../types";
import { storage, publicSettings, backup, restore } from "./storage";
import { sourceContext } from "./materials";
import { paragraphs, spokenText } from "./audio";
describe("local persistence and reading integrity", () => {
  it("never persists API credentials", async () => {
    const s = structuredClone(defaults);
    s.profiles.shared.key = "SECRET_MODEL";
    s.voice.key = "SECRET_VOICE";
    expect(JSON.stringify(publicSettings(s))).not.toContain("SECRET");
    await storage.saveSettings(s);
    expect(JSON.stringify(await storage.settings())).not.toContain("SECRET");
  });
  it("roundtrips session data through IndexedDB and JSON", async () => {
    const s = newSession("World Model", "research");
    s.notes = "我的笔记";
    s.sharedPrompt = "自定义研究规范";
    s.tutorPrompt = "自定义助教";
    s.autoStop = true;
    s.stopReason = "已覆盖问题";
    s.stopAtTurn = 6;
    s.turns = [
      {
        id: "turn-1",
        speaker: 0,
        text: "test",
        status: "complete",
        createdAt: 0,
        citations: [],
        forwarded: ["q1"],
      },
    ];
    s.playback = { turnId: "turn-1", segment: 0, seconds: 12 };
    s.sources = [
      {
        id: "source",
        label: "S1",
        title: "论文",
        kind: "pdf",
        evidence: "extracted",
        text: "内容",
        pages: [{ page: 1, text: "内容" }],
        blobId: "original",
      },
    ];
    await storage.save(s);
    expect((await storage.sessions()).find((x) => x.id === s.id)?.notes).toBe(
      s.notes,
    );
    const r = restore(backup(s));
    expect(r.id).not.toBe(s.id);
    expect(r.sources[0].pages).toEqual(s.sources[0].pages);
    expect(r.sources[0].blobId).toBeUndefined();
    expect(r.notes).toBe(s.notes);
    expect(r.sharedPrompt).toBe(s.sharedPrompt);
    expect(r.tutorPrompt).toBe(s.tutorPrompt);
    expect(r.autoStop).toBe(true);
    expect(r.stopReason).toBe(s.stopReason);
    expect(r.stopAtTurn).toBe(6);
    expect(r.turns[0].forwarded).toEqual(["q1"]);
    expect(r.playback).toEqual(s.playback);
  });
  it("rejects malformed backup instead of breaking the app", () => {
    expect(() => restore('{"app":"guanyan","version":1,"session":{}}')).toThrow(
      "结构不完整",
    );
    const s = newSession("test", "research");
    s.turns = [{ id: "bad", text: 1 } as never];
    expect(() => restore(backup(s))).toThrow("对话格式");
  });
  it("ignores injected backup credential properties", () => {
    const s = newSession("test", "research");
    const b = JSON.parse(backup(s));
    b.session.apiKey = "SECRET";
    b.session.settings = { key: "SECRET" };
    expect(JSON.stringify(restore(JSON.stringify(b)))).not.toContain("SECRET");
  });
  it("retains page provenance and excludes unread sources", () => {
    const s = newSession("VLA", "research");
    s.sources = [
      {
        id: "1",
        label: "S1",
        title: "paper",
        kind: "pdf",
        evidence: "extracted",
        text: "",
        pages: [
          {
            page: 3,
            text: "VLA representations improve action understanding.",
          },
        ],
      },
      {
        id: "2",
        label: "S2",
        title: "unknown",
        kind: "web",
        evidence: "unread",
        text: "untrusted hidden content",
      },
    ];
    const c = sourceContext(s, "VLA");
    expect(c).toContain("[S1:3]");
    expect(c).not.toContain("untrusted hidden content");
  });
  it("does not split code or math across paragraphs", () => {
    const raw =
      "开头\n\n```python\nx=1\n\nprint(x)\n```\n\n$$\na+b\n\n=c\n$$\n\n尾段";
    expect(paragraphs(raw)).toHaveLength(3);
    expect(paragraphs(raw, true)).toHaveLength(4);
    expect(paragraphs(raw, true)[1]).toContain("print(x)");
  });
  it("removes raw markup from ordinary speech", () => {
    expect(spokenText("**结论** [论文](https://example.org) [[S1:3]]")).toBe(
      "结论 论文",
    );
  });
});
