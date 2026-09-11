import type { ModelConfig, VoiceConfig } from "../types";
import { checkedFetch, endpoint, generate } from "./api";
import { storage } from "./storage";

export interface AudioSegment {
  sessionId: string;
  turnId: string;
  index: number;
  text: string;
  speaker: 0 | 1 | 2;
}
export function spokenText(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, "这里给出了一段代码，请结合正文理解。")
    .replace(/\$\$[\s\S]*?\$\$/g, "请参考正文中的公式。")
    .replace(/\$[^$\n]+\$/g, "该数学表达式")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[\[S\d+(?::\d+)?\]\]/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/^[#>*\-\d.]+\s/gm, "")
    .replace(/[*_`~]/g, "")
    .replace(/\|/g, "，")
    .trim();
}
/** Emit only complete paragraphs, preserving fenced code / display math. */
export function paragraphs(text: string, final = false): string[] {
  const lines = text.split("\n");
  const result: string[] = [];
  let current = "";
  let code = false,
    math = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("```")) code = !code;
    const dollars = line.match(/\$\$/g)?.length ?? 0;
    if (dollars % 2) math = !math;
    if (!line.trim() && !code && !math && current.trim()) {
      result.push(current.trim());
      current = "";
    } else current += line + "\n";
  }
  if (final && current.trim()) result.push(current.trim());
  return result;
}
export async function synthesize(
  config: VoiceConfig,
  text: string,
  speaker: number,
  signal?: AbortSignal,
): Promise<Blob> {
  if (!config.key) throw new Error("请先填写语音 API 密钥，或切换到文字模式。");
  if (!config.voices[speaker]) throw new Error("请先设置此角色的音色 ID。");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  let body: Record<string, unknown>;
  let url: string;
  if (config.provider === "elevenlabs") {
    url = endpoint(
      config.baseUrl,
      `/text-to-speech/${encodeURIComponent(config.voices[speaker])}/stream`,
    );
    headers["xi-api-key"] = config.key;
    body = {
      text,
      model_id: config.model,
      voice_settings: { stability: 0.6, similarity_boost: 0.75 },
      language_code: "zh",
    };
  } else {
    url = endpoint(config.baseUrl, "/audio/speech");
    headers.Authorization = `Bearer ${config.key}`;
    body = {
      model: config.model,
      voice: config.voices[speaker],
      input: text,
      response_format: "mp3",
      ...(config.model.includes("gpt-4o")
        ? {
            instructions:
              "用自然清晰的普通话进行研究研讨。英文技术词准确发音，VLA 念字母 V L A，WAM 念字母 W A M，节奏从容，句子间自然停顿。",
          }
        : {}),
    };
  }
  const response = await checkedFetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.any([
      ...(signal ? [signal] : []),
      AbortSignal.timeout(90_000),
    ]),
  });
  const blob = await response.blob();
  if (!blob.size) throw new Error("语音服务返回了空音频。");
  return blob;
}

export class AudioQueue {
  private context?: AudioContext;
  private source?: AudioBufferSourceNode;
  private buffer?: AudioBuffer;
  private resolvePlay?: () => void;
  private generation = 0;
  private controller = new AbortController();
  private chain = Promise.resolve();
  private prep = Promise.resolve();
  private clockStart = 0;
  private offset = 0;
  private rate = 1;
  private active?: AudioSegment;
  private pauseFlag = false;
  onChange: (segment?: AudioSegment, seconds?: number) => void = () => {};
  onCacheError: (message: string) => void = () => {};
  private ensure() {
    this.context ??= new AudioContext();
    return this.context;
  }
  unlock() {
    const ctx = this.ensure();
    void ctx.resume();
  }
  setSpeed(speed: number) {
    if (this.source && this.context) {
      this.offset = this.position();
      this.clockStart = this.context.currentTime;
      this.source.playbackRate.value = speed;
    }
    this.rate = speed;
  }
  position() {
    return this.source && this.context
      ? Math.min(
          this.buffer?.duration ?? Infinity,
          this.offset +
            (this.context.currentTime - this.clockStart) * this.rate,
        )
      : this.offset;
  }
  get current() {
    return this.active;
  }
  get paused() {
    return this.pauseFlag;
  }
  pause() {
    this.pauseFlag = true;
    this.onChange(this.active, this.position());
    void this.context?.suspend();
  }
  resume() {
    this.pauseFlag = false;
    void this.context?.resume();
  }
  stop() {
    this.generation++;
    this.controller.abort();
    this.controller = new AbortController();
    this.source?.stop();
    this.resolvePlay?.();
    this.source = undefined;
    this.active = undefined;
    this.buffer = undefined;
    this.offset = 0;
    this.chain = Promise.resolve();
    this.prep = Promise.resolve();
    this.pauseFlag = false;
    this.onChange();
  }
  enqueue(
    segment: AudioSegment,
    config: VoiceConfig,
    model: ModelConfig,
    offset = 0,
  ): Promise<void> {
    const generation = this.generation;
    const signal = this.controller.signal;
    // Synthesis is serialized independently of playback, so the next paragraph can prepare during speech.
    const ready = this.prep.then(async () => {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      let text = spokenText(segment.text);
      const signature = JSON.stringify([
        config.provider,
        config.baseUrl,
        config.model,
        config.voices[segment.speaker],
        segment.text,
      ]);
      const hash = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(signature),
          ),
        ),
      )
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
      const key = `audio:${segment.sessionId}:${segment.turnId}:${segment.index}:${hash}`;
      const cached = await storage.asset(key).catch(() => undefined);
      if (cached) return cached;
      if (/\$|```|\|.*\|/.test(segment.text)) {
        const result = await generate(model, {
          system:
            "你是严谨的中文研究口播编辑。将给定段落转换为适合听的中文短文。将公式与代码解释为自然语言，忠实保留原有断言及条件；绝不增加原文没有的事实或结论。移除 Markdown、链接、引用编号。只输出可朗读文字，不输出前言。",
          messages: [{ role: "user", content: segment.text }],
          maxTokens: 2200,
          signal,
        });
        text = result.text;
      }
      const blob = await synthesize(config, text, segment.speaker, signal);
      await storage
        .asset(key, blob)
        .catch(() =>
          this.onCacheError(
            "音频缓存空间不足，本段仍可播放。可在设置中清理缓存。",
          ),
        );
      return blob;
    });
    // Wait for the preceding playback before preparing more than one paragraph ahead.
    const before = this.chain;
    this.prep = Promise.all([ready, before]).then(() => {});
    void this.prep.catch(() => {});
    void ready.catch(() => {});
    this.chain = before.then(async () => {
      const blob = await ready;
      if (generation !== this.generation) return;
      const ctx = this.ensure();
      const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
      if (generation !== this.generation) return;
      this.buffer = buffer;
      this.active = segment;
      this.offset = offset;
      this.onChange(segment, offset);
      if (this.pauseFlag) await ctx.suspend();
      else await ctx.resume();
      await new Promise<void>((resolve) => {
        this.resolvePlay = resolve;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = this.rate;
        source.connect(ctx.destination);
        this.source = source;
        this.clockStart = ctx.currentTime;
        source.onended = () => {
          if (this.source === source) this.source = undefined;
          resolve();
        };
        source.start(0, Math.min(offset, Math.max(0, buffer.duration - 0.01)));
      });
      if (generation === this.generation) {
        this.offset = 0;
        this.active = undefined;
        this.onChange();
      }
    });
    void this.chain.catch(() => {});
    return this.chain;
  }
  drain() {
    return this.chain;
  }
}
