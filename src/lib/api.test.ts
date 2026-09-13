import { describe, it, expect, vi, afterEach } from "vitest";
import { generate, sse, safeUrl, endpoint, supportsSearch } from "./api";
import type { ModelConfig } from "../types";
const config: ModelConfig = {
  provider: "openai",
  baseUrl: "https://api.example.test/v1",
  model: "test-model",
  key: "test-only-key",
};
function response(events: unknown[]) {
  return new Response(
    events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(""),
    { headers: { "Content-Type": "text/event-stream" } },
  );
}
afterEach(() => vi.unstubAllGlobals());
describe("stream and provider contracts", () => {
  it("handles split Unicode and CRLF frames", async () => {
    const bytes = new TextEncoder().encode(
      "event: text\r\ndata: 中文\r\n\r\ndata: [DONE]\r\n\r\n",
    );
    const stream = new ReadableStream({
      start(c) {
        for (let i = 0; i < bytes.length; i += 3)
          c.enqueue(bytes.slice(i, i + 3));
        c.close();
      },
    });
    const out = [];
    for await (const e of sse(new Response(stream))) out.push(e);
    expect(out).toEqual(["中文", "[DONE]"]);
  });
  it("returns OpenAI deltas, native citations and usage", async () => {
    const fetch = vi.fn().mockResolvedValue(
      response([
        { type: "response.web_search_call.completed" },
        { type: "response.output_text.delta", delta: "结果" },
        {
          type: "response.output_text.annotation.added",
          annotation: {
            url: "https://arxiv.org/abs/2301.04104",
            title: "DreamerV3",
          },
        },
        {
          type: "response.completed",
          response: { usage: { input_tokens: 10, output_tokens: 3 } },
        },
      ]),
    );
    vi.stubGlobal("fetch", fetch);
    const deltas: string[] = [];
    const r = await generate(config, {
      system: "test",
      messages: [{ role: "user", content: "test" }],
      search: true,
      onDelta: (d) => deltas.push(d),
    });
    expect(r.text).toBe("结果");
    expect(r.citations).toHaveLength(1);
    expect(r.usage.input).toBe(10);
    expect(deltas).toEqual(["结果"]);
    expect(JSON.parse(fetch.mock.calls[0][1].body).store).toBe(false);
  });
  it("rejects premature EOF, preserving emitted content", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          response([{ type: "response.output_text.delta", delta: "partial" }]),
        ),
    );
    const deltas: string[] = [];
    await expect(
      generate(config, {
        system: "",
        messages: [],
        onDelta: (d) => deltas.push(d),
      }),
    ).rejects.toThrow("断开");
    expect(deltas).toEqual(["partial"]);
  });
  it("does not label an unsourced response as a successful search", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          response([
            { type: "response.output_text.delta", delta: "未搜索" },
            { type: "response.completed" },
          ]),
        ),
    );
    await expect(
      generate(config, { system: "", messages: [], search: true }),
    ).rejects.toThrow("可核对");
  });
  it("reads Claude native citations and completion", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response([
          { type: "message_start", message: { usage: { input_tokens: 15 } } },
          {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "审稿意见" },
          },
          {
            type: "content_block_delta",
            delta: {
              type: "citations_delta",
              citation: { url: "https://example.org/paper", title: "论文" },
            },
          },
          {
            type: "message_delta",
            usage: { output_tokens: 8 },
            delta: { stop_reason: "end_turn" },
          },
          { type: "message_stop" },
        ]),
      ),
    );
    const r = await generate(
      { ...config, provider: "claude" },
      { system: "test", messages: [{ role: "user", content: "test" }] },
    );
    expect(r.text).toBe("审稿意见");
    expect(r.citations[0].title).toBe("论文");
    expect(r.usage).toEqual({ input: 15, output: 8 });
  });
  it("reads Gemini grounding and ignores thought text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response([
          {
            candidates: [
              {
                content: {
                  parts: [{ text: "private", thought: true }, { text: "正文" }],
                },
                groundingMetadata: {
                  webSearchQueries: ["paper"],
                  groundingChunks: [
                    {
                      web: {
                        uri: "https://example.org/paper",
                        title: "论文",
                      },
                    },
                  ],
                },
                finishReason: "STOP",
              },
            ],
            usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
          },
        ]),
      ),
    );
    const r = await generate(
      { ...config, provider: "gemini" },
      { system: "", messages: [], search: true },
    );
    expect(r.text).toBe("正文");
    expect(r.searched).toBe(true);
    expect(r.citations).toHaveLength(1);
  });
  it("reads compatible chat completions with DONE", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            'data: {"choices":[{"delta":{"content":"hello"}}]}\n\ndata: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
          ),
        ),
    );
    expect(
      (
        await generate(
          { ...config, provider: "compatible" },
          { system: "", messages: [] },
        )
      ).text,
    ).toBe("hello");
  });
  it.each([401, 403, 429, 500])(
    "reports HTTP %s without echoing sensitive response bodies",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response("server may echo secret", { status }),
          ),
      );
      await expect(
        generate(config, { system: "", messages: [] }),
      ).rejects.not.toThrow("server may echo secret");
    },
  );
  it("rejects unsafe endpoint schemes", () => {
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(() => endpoint("http://remote.test", "/v1")).toThrow("HTTPS");
    expect(endpoint("http://localhost:1234", "/v1")).toBe(
      "http://localhost:1234/v1",
    );
  });
});

const glm: ModelConfig = {
  ...config,
  provider: "compatible",
  baseUrl: "https://open.bigmodel.cn/api/paas/v4",
  model: "glm-4-air",
};
describe("BigModel native search through compatible chat", () => {
  it("recognizes only the ordinary official endpoint", () => {
    expect(supportsSearch(glm)).toBe(true);
    expect(supportsSearch({ ...glm, baseUrl: glm.baseUrl + "/" })).toBe(true);
    for (const baseUrl of [
      "https://open.bigmodel.cn/api/coding/paas/v4",
      "https://open.bigmodel.cn.evil.test/api/paas/v4",
      "https://proxy.test/v1",
      "invalid",
    ]) {
      expect(supportsSearch({ ...glm, baseUrl })).toBe(false);
    }
  });
  it("fetches sources before asking GLM and retains them without chat annotations", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          search_result: [
            {
              link: "https://example.org/paper",
              title: "论文",
              content: "摘要",
            },
            { link: "https://example.org/paper" },
            { link: "javascript:alert(1)" },
          ],
        }),
      )
      .mockResolvedValueOnce(
        response([
          {
            choices: [{ delta: { content: "结果" }, finish_reason: "stop" }],
            usage: { prompt_tokens: 12, completion_tokens: 3 },
          },
        ]),
      );
    vi.stubGlobal("fetch", fetch);
    const result = await generate(glm, {
      system: "test",
      messages: [{ role: "user", content: "最近的论文" }],
      search: true,
      searchQuery: "WAM 最新论文",
    });
    expect(fetch.mock.calls[0][0]).toBe(glm.baseUrl + "/web_search");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      search_query: "WAM 最新论文",
      search_intent: false,
      search_engine: "search_std",
    });
    expect(fetch.mock.calls[1][0]).toBe(glm.baseUrl + "/chat/completions");
    const body = JSON.parse(fetch.mock.calls[1][1].body);
    expect(body.tools).toBeUndefined();
    expect(body.messages[0].content).toContain("https://example.org/paper");
    expect(body.messages[0].content).toContain("不代表已读全文");
    expect(result.searched).toBe(true);
    expect(result.citations).toEqual([
      { url: "https://example.org/paper", title: "论文", excerpt: "摘要" },
    ]);
    expect(result.usage).toEqual({ input: 12, output: 3 });
  });
  it("stops before generation if the search returns no sources", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(Response.json({ search_result: [] }));
    vi.stubGlobal("fetch", fetch);
    await expect(
      generate(glm, {
        system: "",
        messages: [],
        search: true,
        searchQuery: "WAM",
      }),
    ).rejects.toThrow("尚未调用模型");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("identifies search permission errors without exposing response bodies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("secret", { status: 403 })),
    );
    await expect(
      generate(glm, {
        system: "",
        messages: [],
        search: true,
        searchQuery: "WAM",
      }),
    ).rejects.toThrow("智谱独立搜索失败");
  });
  it("does not start generation when cancelled after search", async () => {
    const controller = new AbortController();
    const fetch = vi.fn().mockImplementation(async () => {
      controller.abort();
      return Response.json({
        search_result: [{ link: "https://example.org", title: "论文" }],
      });
    });
    vi.stubGlobal("fetch", fetch);
    await expect(
      generate(glm, {
        system: "",
        messages: [],
        search: true,
        searchQuery: "WAM",
        signal: controller.signal,
      }),
    ).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("does not enable search in text-only requests", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        response([
          { choices: [{ delta: { content: "结果" }, finish_reason: "stop" }] },
        ]),
      );
    vi.stubGlobal("fetch", fetch);
    await generate(glm, { system: "", messages: [] });
    expect(JSON.parse(fetch.mock.calls[0][1].body).tools).toBeUndefined();
  });
  it("rejects unadapted services before making a request", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(
      generate(
        { ...glm, baseUrl: "https://open.bigmodel.cn/api/coding/paas/v4" },
        { system: "", messages: [], search: true },
      ),
    ).rejects.toThrow("MCP");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("GLM reasoning budget", () => {
  it("reserves thinking capacity even for short internal tasks", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        response([
          { choices: [{ delta: { content: "完成" }, finish_reason: "stop" }] },
        ]),
      );
    vi.stubGlobal("fetch", fetch);
    await generate(
      { ...glm, model: "glm-5.4" },
      { system: "", messages: [], maxTokens: 100 },
    );
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.max_tokens).toBe(16384);
    expect(body.reasoning_effort).toBe("high");
  });
  it("distinguishes a thinking-only truncation from a tool finish", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response([
          {
            choices: [
              {
                delta: { reasoning_content: "internal" },
                finish_reason: "length",
              },
            ],
          },
        ]),
      ),
    );
    await expect(generate(glm, { system: "", messages: [] })).rejects.toThrow(
      "输出正文前",
    );
  });
});
