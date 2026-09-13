import type {
  Citation,
  ModelConfig,
  ModelRequest,
  ModelResult,
} from "../types";

export function safeUrl(value: string): string | undefined {
  try {
    const u = new URL(value);
    return /^https?:$/.test(u.protocol) ? u.href : undefined;
  } catch {
    return undefined;
  }
}
export function endpoint(base: string, path: string) {
  const u = safeUrl(base);
  if (!u) throw new Error("请填写有效的 HTTPS 接口地址。");
  const parsed = new URL(u);
  if (
    parsed.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)
  )
    throw new Error("远程接口须使用 HTTPS。");
  return u.replace(/\/$/, "") + path;
}
export function checkConfig(config: ModelConfig) {
  if (!config.key.trim())
    throw new Error("请先在「模型与声音」中填写当前角色的 API 密钥。");
  if (!config.model.trim()) throw new Error("请先填写可用的模型名称。");
  endpoint(config.baseUrl, "");
}
export function errorMessage(e: unknown): string {
  if (e instanceof Error && e.name === "AbortError") return "操作已停止";
  if (e instanceof TypeError)
    return "无法连接服务。请检查网络及接口的浏览器跨域支持；可填写支持直连的服务地址。";
  return e instanceof Error ? e.message : "请求未完成，请重试。";
}
export async function checkedFetch(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: "请求不被服务支持，请核对模型、接口类型及联网工具配置。",
      401: "密钥无效或已过期，请重新配置。",
      403: "服务拒绝访问，请检查账户权限、地区或浏览器访问设置。",
      404: "接口或模型不存在，请检查地址和模型名。",
      413: "材料超出服务容量，请缩短材料。",
      429: "请求达到限额，请稍后继续或检查账户余额。",
    };
    throw new Error(
      messages[response.status] ??
        `服务暂时不可用（HTTP ${response.status}），已保留进度。`,
    );
  }
  return response;
}

/** SSE framing survives split UTF-8, CRLF, multiple data lines and trailing frames. */
export async function* sse(response: Response): AsyncGenerator<string> {
  if (!response.body) throw new Error("服务没有返回可读取的数据流。");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const extract = (frame: string) =>
    frame
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).replace(/^ /, ""))
      .join("\n");
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      buffer = buffer.replace(/\r\n/g, "\n");
      let index;
      while ((index = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        const data = extract(frame);
        if (data) yield data;
      }
      if (done) {
        const data = extract(buffer);
        if (data) yield data;
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/** Only the documented ordinary BigModel endpoint declares this search protocol. */
export function supportsSearch(config: ModelConfig): boolean {
  return config.provider !== "compatible" || isBigModel(config);
}
function isBigModel(config: ModelConfig): boolean {
  try {
    const url = new URL(config.baseUrl);
    return (
      config.provider === "compatible" &&
      url.protocol === "https:" &&
      url.hostname === "open.bigmodel.cn" &&
      url.pathname.replace(/\/$/, "") === "/api/paas/v4"
    );
  } catch {
    return false;
  }
}

export async function generate(
  config: ModelConfig,
  request: ModelRequest,
): Promise<ModelResult> {
  checkConfig(config);
  if (request.search && !supportsSearch(config))
    throw new Error(
      "此兼容服务尚未适配联网协议。智谱普通 API 请使用 https://open.bigmodel.cn/api/paas/v4；Coding Plan 的搜索需要独立 MCP，暂未接入。其他服务可使用已支持的原生搜索接口，或关闭联网并导入资料。",
    );
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  let url: string;
  let body: Record<string, unknown>;
  const max = request.maxTokens ?? 2600;
  const glmVersion = config.model.match(/^glm-(\d+)(?:\.(\d+))?(?:-|$)/i);
  const glmMajor = Number(glmVersion?.[1] ?? 0);
  const glmMinor = Number(glmVersion?.[2] ?? 0);
  const glmThinking =
    isBigModel(config) && (glmMajor >= 5 || (glmMajor === 4 && glmMinor >= 5));
  switch (config.provider) {
    case "openai":
      url = endpoint(config.baseUrl, "/responses");
      headers.Authorization = `Bearer ${config.key}`;
      body = {
        model: config.model,
        instructions: request.system,
        input: request.messages,
        stream: true,
        max_output_tokens: max,
        store: false,
        ...(request.search
          ? {
              tools: [{ type: "web_search" }],
              tool_choice: "required",
              include: ["web_search_call.action.sources"],
            }
          : {}),
      };
      break;
    case "claude":
      url = endpoint(config.baseUrl, "/messages");
      headers["x-api-key"] = config.key;
      headers["anthropic-version"] = "2023-06-01";
      headers["anthropic-dangerous-direct-browser-access"] = "true";
      body = {
        model: config.model,
        system: request.system,
        messages: request.messages,
        max_tokens: max,
        stream: true,
        ...(request.search
          ? {
              tools: [
                {
                  type: "web_search_20250305",
                  name: "web_search",
                  max_uses: 4,
                },
              ],
            }
          : {}),
      };
      break;
    case "gemini":
      url = endpoint(
        config.baseUrl,
        `/models/${encodeURIComponent(config.model)}:streamGenerateContent?alt=sse`,
      );
      headers["x-goog-api-key"] = config.key;
      body = {
        systemInstruction: { parts: [{ text: request.system }] },
        contents: request.messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: max },
        ...(request.search ? { tools: [{ google_search: {} }] } : {}),
      };
      break;
    default:
      url = endpoint(config.baseUrl, "/chat/completions");
      headers.Authorization = `Bearer ${config.key}`;
      body = {
        model: config.model,
        messages: [
          { role: "system", content: request.system },
          ...request.messages,
        ],
        stream: true,
        // GLM's output allowance must also accommodate its thinking tokens.
        max_tokens: glmThinking ? Math.max(max, 16384) : max,
        ...(glmThinking && (glmMajor > 5 || (glmMajor === 5 && glmMinor >= 2))
          ? { reasoning_effort: "high" }
          : {}),
        ...(isBigModel(config)
          ? {}
          : { stream_options: { include_usage: true } }),
        ...(request.search && isBigModel(config)
          ? {
              tools: [
                {
                  type: "web_search",
                  web_search: {
                    enable: true,
                    search_engine: "search_std",
                    search_result: true,
                    require_search: true,
                  },
                },
              ],
            }
          : {}),
      };
  }
  const result: ModelResult = {
    text: "",
    citations: [],
    usage: { input: 0, output: 0 },
    searched: false,
  };
  let finished = false;
  const add = (c: any) => {
    const url = safeUrl(c?.url ?? c?.uri ?? "");
    if (url && !result.citations.some((x) => x.url === url))
      result.citations.push({
        url,
        title: String(c.title ?? url),
        excerpt: typeof c.cited_text === "string" ? c.cited_text : undefined,
      });
  };
  const delta = (value: unknown) => {
    if (typeof value === "string") {
      result.text += value;
      request.onDelta?.(value);
    }
  };
  const signal = AbortSignal.any([
    ...(request.signal ? [request.signal] : []),
    AbortSignal.timeout(240_000),
  ]);
  const response = await checkedFetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });
  for await (const data of sse(response)) {
    if (data === "[DONE]") {
      finished = true;
      break;
    }
    let event: any;
    try {
      event = JSON.parse(data);
    } catch {
      throw new Error("服务返回了无法解析的数据流，已保留收到的文字。");
    }
    if (
      event.error ||
      event.type === "error" ||
      event.type === "response.failed"
    )
      throw new Error("模型服务报告错误，请检查接口支持情况后重试。");
    if (config.provider === "openai") {
      if (event.type === "response.output_text.delta") delta(event.delta);
      if (event.type === "response.output_text.annotation.added")
        add(event.annotation);
      if (event.type?.startsWith("response.web_search_call"))
        result.searched = true;
      if (event.type === "response.completed") {
        finished = true;
        result.usage = {
          input: event.response?.usage?.input_tokens ?? 0,
          output: event.response?.usage?.output_tokens ?? 0,
        };
        for (const item of event.response?.output ?? []) {
          if (item.type === "web_search_call") {
            result.searched = true;
            for (const c of item.action?.sources ?? []) add(c);
          }
          for (const part of item.content ?? [])
            for (const c of part.annotations ?? []) add(c);
        }
      }
      if (event.type === "response.incomplete")
        throw new Error(
          "模型输出达到上限而中断，请提高接口限额或缩短单次回答后重试。",
        );
    } else if (config.provider === "claude") {
      if (event.type === "content_block_delta") {
        if (event.delta?.type === "text_delta") delta(event.delta.text);
        if (event.delta?.citation) add(event.delta.citation);
      }
      if (event.type === "content_block_start") {
        const b = event.content_block;
        if (b?.type === "text" && b.text) delta(b.text);
        if (b?.type === "server_tool_use" && b.name === "web_search")
          result.searched = true;
        if (b?.type === "web_search_tool_result") {
          if (!Array.isArray(b.content))
            throw new Error("联网搜索工具执行失败，请检查搜索权限后重试。");
          for (const c of b.content ?? []) add(c);
        }
      }
      if (event.message?.usage)
        result.usage.input = event.message.usage.input_tokens ?? 0;
      if (event.usage) result.usage.output = event.usage.output_tokens ?? 0;
      if (
        event.type === "message_delta" &&
        ["max_tokens", "pause_turn"].includes(event.delta?.stop_reason)
      )
        throw new Error("本次回答未完整结束，请缩短任务或重试。");
      if (event.type === "message_stop") finished = true;
    } else if (config.provider === "gemini") {
      const c = event.candidates?.[0];
      for (const p of c?.content?.parts ?? []) if (!p.thought) delta(p.text);
      for (const item of c?.groundingMetadata?.groundingChunks ?? [])
        add(item.web);
      if (c?.groundingMetadata?.webSearchQueries?.length)
        result.searched = true;
      if (event.usageMetadata)
        result.usage = {
          input: event.usageMetadata.promptTokenCount ?? 0,
          output: event.usageMetadata.candidatesTokenCount ?? 0,
        };
      if (c?.finishReason) {
        if (c.finishReason !== "STOP")
          throw new Error(
            `模型未完整生成（${c.finishReason}），请调整问题后重试。`,
          );
        finished = true;
      }
      if (event.promptFeedback?.blockReason)
        throw new Error("服务未接受本次请求，请调整材料或问题。");
    } else {
      const c = event.choices?.[0];
      if (isBigModel(config) && Array.isArray(event.web_search)) {
        for (const source of event.web_search) {
          add({
            url: source?.link,
            title: source?.title,
            cited_text: source?.content,
          });
        }
        if (result.citations.length) result.searched = true;
      }
      delta(c?.delta?.content);
      if (c?.finish_reason) {
        if (c.finish_reason === "length")
          throw new Error(
            result.text.trim()
              ? "本次输出额度已用尽，回答尚未完成。已保留收到的正文，请重试。"
              : "模型在输出正文前耗尽了本次额度，可能消耗在思考阶段。请重试或改用推理开销较小的模型。",
          );
        if (c.finish_reason !== "stop")
          throw new Error(
            "模型未正常结束回答（结束类型：" +
              String(c.finish_reason)
                .replace(/[^a-zA-Z0-9_-]/g, "")
                .slice(0, 40) +
              "），请核对模型的工具支持情况后重试。",
          );
        finished = true;
      }
      if (event.usage)
        result.usage = {
          input: event.usage.prompt_tokens ?? 0,
          output: event.usage.completion_tokens ?? 0,
        };
    }
  }
  if (!finished)
    throw new Error("连接在回答完成前断开，已保留文字。请手动重试本轮。");
  if (!result.text.trim())
    throw new Error("模型没有返回正文，请检查模型是否支持当前接口。");
  if (request.search && (!result.searched || !result.citations.length))
    throw new Error(
      "此次请求没有返回可核对的联网来源。请更换支持搜索的模型，或关闭联网后使用自备资料。",
    );
  return result;
}
export function mergeCitations(a: Citation[], b: Citation[]) {
  return [...new Map([...a, ...b].map((c) => [c.url, c])).values()];
}
