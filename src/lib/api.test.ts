import { describe, it, expect, vi, afterEach } from "vitest";
import { generate, sse, safeUrl, endpoint } from "./api";
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
