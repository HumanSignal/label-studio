import { describe, expect, it, mock } from "bun:test";
import { resolvePreloaded } from "../resolve-preloaded";

describe("resolvePreloaded (FIT-2914)", () => {
  it("uses the fallback when nothing was preloaded", async () => {
    const fallback = mock(async () => "fresh");
    expect(await resolvePreloaded(null, fallback)).toBe("fresh");
    expect(await resolvePreloaded(undefined, fallback)).toBe("fresh");
    expect(fallback).toHaveBeenCalledTimes(2);
  });

  it("uses the fallback when the preload fails or returns an error payload", async () => {
    const fallback = mock(async () => "fresh");
    expect(await resolvePreloaded(Promise.reject(new Error("network")), fallback)).toBe("fresh");
    expect(await resolvePreloaded(Promise.resolve({ error: "bad" }), fallback)).toBe("fresh");
    expect(await resolvePreloaded(Promise.resolve(null), fallback)).toBe("fresh");
    expect(fallback).toHaveBeenCalledTimes(3);
  });

  it("returns a successful preload without calling the fallback", async () => {
    const fallback = mock(async () => "fresh");
    const value = { columns: [] };
    expect(await resolvePreloaded(Promise.resolve(value), fallback)).toBe(value);
    expect(fallback).not.toHaveBeenCalled();
  });
});
