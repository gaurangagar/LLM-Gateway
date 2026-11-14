import { describe, it, expect } from "vitest";
import { generateKey, hashKey } from "../../src/core/apiKeys.js";

describe("apiKeys", () => {
  it("generates prefixed, unique keys", () => {
    const a = generateKey();
    const b = generateKey();
    expect(a.raw.startsWith("gw_live_")).toBe(true);
    expect(a.raw).not.toBe(b.raw);
    expect(a.prefix).toBe(a.raw.slice(0, 12));
  });

  it("hashes deterministically and never returns the raw key", () => {
    const { raw, hash } = generateKey();
    expect(hashKey(raw)).toBe(hash);
    expect(hash).not.toContain(raw);
    expect(hash).toHaveLength(64);
  });
});