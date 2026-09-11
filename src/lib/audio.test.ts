import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioQueue } from "./audio";
import { storage } from "./storage";
import { defaults } from "../types";

describe("audio scheduling with a virtual clock (not an acoustic quality test)", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  it("plays a virtual 20-minute two-segment queue without overlap", async () => {
    vi.useFakeTimers();
    let active = 0,
      maxActive = 0,
      starts = 0;
    class FakeContext {
      currentTime = 0;
      destination = {};
      resume = vi.fn(async () => {});
      suspend = vi.fn(async () => {});
      decodeAudioData = vi.fn(async () => ({ duration: 600 }));
      createBufferSource() {
        return {
          buffer: null,
          playbackRate: { value: 1 },
          connect() {},
          onended: undefined as undefined | (() => void),
          start() {
            starts++;
            active++;
            maxActive = Math.max(active, maxActive);
            setTimeout(() => {
              active--;
              this.onended?.();
            }, 600000);
          },
          stop() {
            this.onended?.();
          },
        };
      }
    }
    vi.stubGlobal("AudioContext", FakeContext);
    vi.spyOn(crypto.subtle, "digest").mockResolvedValue(new ArrayBuffer(32));
    vi.spyOn(storage, "asset").mockResolvedValue(new Blob(["cached-audio"]));
    const queue = new AudioQueue();
    queue.unlock();
    const first = queue.enqueue(
      { sessionId: "s", turnId: "a", index: 0, text: "第一位角色", speaker: 0 },
      defaults.voice,
      defaults.profiles.shared,
    );
    const last = queue.enqueue(
      { sessionId: "s", turnId: "b", index: 0, text: "第二位角色", speaker: 1 },
      defaults.voice,
      defaults.profiles.shared,
    );
    await vi.advanceTimersByTimeAsync(1);
    expect(starts).toBe(1);
    await vi.advanceTimersByTimeAsync(600000);
    await first;
    expect(starts).toBe(2);
    await vi.advanceTimersByTimeAsync(600000);
    await last;
    expect(maxActive).toBe(1);
    expect(active).toBe(0);
    expect(queue.current).toBeUndefined();
    queue.stop();
  });
  it("cancels late prepared audio before it can begin playback", async () => {
    const start = vi.fn();
    class FakeContext {
      currentTime = 0;
      destination = {};
      resume = vi.fn(async () => {});
      suspend = vi.fn(async () => {});
      decodeAudioData = vi.fn(async () => ({ duration: 1 }));
      createBufferSource() {
        return { connect() {}, start, stop() {}, playbackRate: { value: 1 } };
      }
    }
    vi.stubGlobal("AudioContext", FakeContext);
    vi.spyOn(crypto.subtle, "digest").mockResolvedValue(new ArrayBuffer(32));
    let finish!: (blob: Blob) => void;
    vi.spyOn(storage, "asset").mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const queue = new AudioQueue();
    const p = queue.enqueue(
      { sessionId: "s", turnId: "a", index: 0, text: "取消测试", speaker: 0 },
      defaults.voice,
      defaults.profiles.shared,
    );
    await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    queue.stop();
    finish(new Blob(["audio"]));
    await p;
    expect(start).not.toHaveBeenCalled();
  });
});
