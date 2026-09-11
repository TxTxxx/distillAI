import "fake-indexeddb/auto";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ResearchEngine } from "./engine";
import { defaults } from "../types";
import * as api from "./api";
const result = {
  text: "回答",
  citations: [],
  usage: { input: 1, output: 2 },
  searched: false,
};
function engine() {
  const settings = structuredClone(defaults);
  settings.profiles.shared = {
    provider: "compatible",
    baseUrl: "https://example.test/v1",
    model: "test",
    key: "test-only-key",
  };
  const e = new ResearchEngine(settings);
  e.create("VLA 泛化", "research");
  e.update((s) => {
    s.search = false;
    s.rounds = 1;
  });
  return e;
}
afterEach(() => vi.restoreAllMocks());
describe("conversation orchestration", () => {
  it("alternates exactly two speakers per round", async () => {
    vi.spyOn(api, "generate").mockImplementation(async (_c, r) => {
      r.onDelta?.("回答");
      return result;
    });
    const e = engine();
    await e.start();
    expect(e.state.session?.turns.map((t) => t.speaker)).toEqual([0, 1]);
    expect(e.state.status).toBe("complete");
    expect(e.state.session?.turns.every((t) => t.status === "complete")).toBe(
      true,
    );
    e.stop();
    await e.flush();
  });
  it("does not start a second request while the first is running", async () => {
    let finish!: () => void;
    const spy = vi.spyOn(api, "generate").mockImplementation(async (_c, r) => {
      await new Promise<void>((resolve) => (finish = resolve));
      r.onDelta?.("回答");
      return result;
    });
    const e = engine();
    const p = e.start();
    await e.start();
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    e.stop();
    finish();
    await p;
  });
  it("isolates late streaming events after switching sessions", async () => {
    let finish!: () => void;
    let delta: ((s: string) => void) | undefined;
    vi.spyOn(api, "generate").mockImplementation(async (_c, r) => {
      delta = r.onDelta;
      await new Promise<void>((resolve) => (finish = resolve));
      return result;
    });
    const e = engine();
    const p = e.start();
    await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    e.create("新会话", "interview");
    delta?.("旧会话内容");
    finish();
    await p;
    expect(e.state.session?.title).toBe("新会话");
    expect(e.state.session?.turns).toHaveLength(0);
  });
  it("pause finishes current turn but does not schedule the next", async () => {
    let finish!: () => void;
    const spy = vi.spyOn(api, "generate").mockImplementation(async (_c, r) => {
      await new Promise<void>((resolve) => (finish = resolve));
      r.onDelta?.("回答");
      return result;
    });
    const e = engine();
    const p = e.start();
    await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    e.pause();
    finish();
    await new Promise((r) => setTimeout(r, 10));
    expect(e.state.session?.turns).toHaveLength(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(e.state.status).toBe("paused");
    e.stop();
    await p;
  });
  it("forwards questions once at the next generation boundary", async () => {
    const requests: string[] = [];
    vi.spyOn(api, "generate").mockImplementation(async (_c, r) => {
      requests.push(r.messages[0].content);
      r.onDelta?.("回答");
      return result;
    });
    const e = engine();
    e.forward("q1", "为什么需要消融？");
    e.forward("q1", "为什么需要消融？");
    await e.start();
    expect(requests[0]).toContain("为什么需要消融");
    expect(requests[1]).not.toContain("为什么需要消融");
    e.forward("q1", "为什么需要消融？");
    expect(e.state.session?.pendingQuestions).toHaveLength(0);
    e.stop();
  });
  it("tutor snapshots do not include later main turns", async () => {
    let finish!: () => void;
    let prompt = "";
    vi.spyOn(api, "generate").mockImplementation(async (_c, r) => {
      prompt = r.messages[0].content;
      await new Promise<void>((resolve) => (finish = resolve));
      r.onDelta?.("助教回答");
      return result;
    });
    const e = engine();
    const p = e.ask("解释这个问题");
    e.update((s) =>
      s.turns.push({
        id: "later",
        speaker: 0,
        text: "后来才生成的文字",
        status: "complete",
        createdAt: Date.now(),
        citations: [],
      }),
    );
    finish();
    await p;
    expect(prompt).not.toContain("后来才生成");
    expect(e.state.session?.tutor[0].snapshotIds).toEqual([]);
    expect(e.state.session?.tutor[1].status).toBe("complete");
    e.stop();
  });
  it("marks failed turns and retries instead of duplicating", async () => {
    const spy = vi
      .spyOn(api, "generate")
      .mockImplementationOnce(async (_c, r) => {
        r.onDelta?.("半句话");
        throw new Error("断网");
      })
      .mockImplementation(async (_c, r) => {
        r.onDelta?.("完整回答");
        return result;
      });
    const e = engine();
    await e.start();
    const id = e.state.session?.turns[0].id;
    expect(e.state.status).toBe("error");
    await e.start();
    expect(e.state.session?.turns[0].id).toBe(id);
    expect(e.state.session?.turns[0].text).toBe("完整回答");
    expect(e.state.session?.turns).toHaveLength(2);
    expect(spy).toHaveBeenCalledTimes(4);
    e.stop();
  });
});
