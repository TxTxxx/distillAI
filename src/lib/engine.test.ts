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

describe("autonomous conclusion and editable prompts", () => {
  it("concludes after three full rounds, saves reason, and restores completed state", async () => {
    vi.spyOn(api, "generate").mockImplementation(async (_c, r) => {
      if (r.system.includes("收束评估员"))
        return {
          ...result,
          text: '{"stop":true,"reason":"机制、反例与验证路径已覆盖。"}',
        };
      r.onDelta?.("观点与实验设计");
      return result;
    });
    const e = engine();
    e.update((s) => {
      s.rounds = 12;
      s.autoStop = true;
    });
    await e.start();
    expect(e.state.session?.turns).toHaveLength(6);
    expect(e.state.session?.stopReason).toContain("验证路径");
    expect(e.state.status).toBe("complete");
    const saved = structuredClone(e.state.session!);
    e.select(saved);
    expect(e.state.status).toBe("complete");
    e.stop();
  });
  it("continues to the cap when the decision is malformed", async () => {
    vi.spyOn(api, "generate").mockImplementation(async (_c, r) => {
      r.onDelta?.("继续推导");
      return {
        ...result,
        text: r.system.includes("收束评估员") ? "结束吧" : result.text,
      };
    });
    const e = engine();
    e.update((s) => {
      s.rounds = 4;
      s.autoStop = true;
    });
    await e.start();
    expect(e.state.session?.turns).toHaveLength(8);
    expect(e.state.session?.stopReason).toContain("最大轮数");
    e.stop();
  });
  it("does not discard a question forwarded while judging", async () => {
    const e = engine();
    let decisions = 0;
    vi.spyOn(api, "generate").mockImplementation(async (_c, r) => {
      if (r.system.includes("收束评估员")) {
        decisions++;
        e.forward("late", "新的验证问题");
        return { ...result, text: '{"stop":true,"reason":"充分"}' };
      }
      r.onDelta?.("回答");
      return result;
    });
    e.update((s) => {
      s.rounds = 4;
      s.autoStop = true;
    });
    await e.start();
    expect(decisions).toBe(1);
    expect(e.state.session?.turns).toHaveLength(8);
    expect(e.state.session?.turns[6].forwarded).toContain("late");
    e.stop();
  });
  it("uses edited instructions for both speakers and the tutor", async () => {
    const prompts: string[] = [];
    vi.spyOn(api, "generate").mockImplementation(async (_c, r) => {
      prompts.push(r.system);
      r.onDelta?.("回答");
      return result;
    });
    const e = engine();
    e.update((s) => {
      s.sharedPrompt = "共同指令测试";
      s.roles[0].duty = "A 自定义研究方法";
      s.roles[1].duty = "B 自定义质疑方式";
      s.tutorPrompt = "助教自定义举例方式";
    });
    await e.start();
    await e.ask("解释");
    expect(prompts[0]).toContain("共同指令测试");
    expect(prompts[0]).toContain("A 自定义研究方法");
    expect(prompts[1]).toContain("B 自定义质疑方式");
    expect(prompts.at(-1)).toContain("助教自定义举例方式");
    e.stop();
  });
});

describe("tutor web search", () => {
  it.each([true, false])(
    "inherits session search=%s and retains citations",
    async (search) => {
      const citations = search
        ? [{ url: "https://example.org/paper", title: "Paper" }]
        : [];
      const spy = vi
        .spyOn(api, "generate")
        .mockResolvedValue({ ...result, citations, searched: search });
      const e = engine();
      e.update((s) => {
        s.search = search;
      });
      await e.ask("查找相关论文");
      expect(spy.mock.calls[0][1].search).toBe(search);
      expect(e.state.session?.tutor[1].citations).toEqual(citations);
      expect(e.state.session?.tutor[1].status).toBe("complete");
      e.stop();
      await e.flush();
    },
  );
  it("discards late tutor search results after switching sessions", async () => {
    let finish!: (r: typeof result) => void;
    vi.spyOn(api, "generate").mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const e = engine();
    e.update((s) => {
      s.search = true;
    });
    const pending = e.ask("查找论文");
    e.create("另一场", "research");
    finish(result);
    await pending;
    expect(e.state.session?.tutor).toEqual([]);
    expect(e.state.tutorBusy).toBe(false);
    e.stop();
    await e.flush();
  });
});
