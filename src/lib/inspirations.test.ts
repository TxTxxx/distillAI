import { describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import {
  defaultInspirations,
  nextInspirations,
  rememberInspirations,
  validateInspirations,
} from "./inspirations";
import { storage } from "./storage";

describe("inspiration library", () => {
  it("cycles through the entire pool before repeating a question", () => {
    let history: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const group = nextInspirations(defaultInspirations, history);
      for (const item of group) {
        expect(seen.has(item.id)).toBe(false);
        seen.add(item.id);
      }
      history = rememberInspirations(
        history,
        group,
        defaultInspirations.length,
      );
    }
    expect(seen.size).toBe(18);
    expect(
      nextInspirations(defaultInspirations, history).map((x) => x.id),
    ).toEqual(defaultInspirations.slice(0, 3).map((x) => x.id));
  });
  it("honours filtered pools and handles fewer than three questions", () => {
    const pool = defaultInspirations.filter((x) => x.tag === "VLA").slice(0, 2);
    expect(
      nextInspirations(
        pool,
        pool.map((x) => x.id),
      ),
    ).toEqual(pool);
    expect(nextInspirations([])).toEqual([]);
  });
  it("stores edits and preserves an intentionally empty library", async () => {
    const edited = [
      {
        ...defaultInspirations[0],
        question: "我自己保存的问题",
        prompt: "我的问题内容",
      },
    ];
    await storage.saveInspirations(edited);
    expect(await storage.inspirations()).toEqual(edited);
    await storage.saveInspirations([]);
    expect(await storage.inspirations()).toEqual([]);
  });
  it("rejects malformed imports and strips unknown fields", () => {
    expect(() =>
      validateInspirations([defaultInspirations[0], defaultInspirations[0]]),
    ).toThrow();
    expect(() =>
      validateInspirations([{ ...defaultInspirations[0], prompt: "" }]),
    ).toThrow();
    expect(() =>
      validateInspirations([{ ...defaultInspirations[0], tag: "Other" }]),
    ).toThrow();
    expect(
      validateInspirations([
        { ...defaultInspirations[0], key: "not persisted" },
      ])[0],
    ).not.toHaveProperty("key");
  });
});
