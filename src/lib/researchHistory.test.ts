import { describe, expect, it } from "vitest";
import { newSession } from "../types";
import { appendExcerpt, findSessions, hasExcerpt } from "./researchHistory";
import { exampleSession } from "./demo";

describe("research continuity", () => {
  it("finds dialogue content and notes as well as titles", () => {
    const session = exampleSession();
    expect(findSessions([session], " 梯度冲突 ", "all")).toEqual([session]);
    expect(findSessions([session], "不存在的词", "all")).toEqual([]);
    session.notes = "FoO research";
    expect(findSessions([session], "foo", "notes")).toEqual([session]);
  });
  it("combines content search with note and bookmark filters", () => {
    const empty = newSession("对照实验", "research");
    const saved = exampleSession();
    saved.bookmarks = [saved.turns[0].id];
    expect(findSessions([empty, saved], "", "notes")).toEqual([saved]);
    expect(findSessions([empty, saved], "", "bookmarks")).toEqual([saved]);
    expect(findSessions([empty, saved], "不存在的词", "bookmarks")).toEqual([]);
  });
  it("preserves manual notes and quotes multiline excerpts only once", () => {
    const notes = appendExcerpt("我的认识", "第一段\n\n第二段");
    expect(notes).toContain("我的认识\n\n### 收藏摘录\n\n> 第一段");
    expect(notes).toContain("> 第一段\n> \n> 第二段");
    expect(hasExcerpt(notes, "第一段\n\n第二段")).toBe(true);
    expect(hasExcerpt(notes, "另一段")).toBe(false);
    expect(appendExcerpt(notes, "第一段\n\n第二段")).toBe(notes);
  });
});
