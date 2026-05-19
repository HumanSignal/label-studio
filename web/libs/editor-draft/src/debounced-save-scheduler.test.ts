import { describe, expect, it } from "bun:test";
import { DebouncedSaveScheduler } from "./debounced-save-scheduler";

describe("DebouncedSaveScheduler", () => {
  it("runs scheduled callback after delay", async () => {
    const scheduler = new DebouncedSaveScheduler(20);
    let ran = false;
    scheduler.schedule(async () => {
      ran = true;
    });
    await new Promise((r) => setTimeout(r, 35));
    expect(ran).toBe(true);
    scheduler.dispose();
  });

  it("cancels in-flight work when generation bumps", async () => {
    const scheduler = new DebouncedSaveScheduler(30);
    let ran = false;
    scheduler.schedule(async () => {
      ran = true;
    });
    scheduler.bumpGeneration();
    await new Promise((r) => setTimeout(r, 45));
    expect(ran).toBe(false);
    scheduler.dispose();
  });

  it("flush runs pending callback immediately", async () => {
    const scheduler = new DebouncedSaveScheduler(5000);
    let ran = false;
    scheduler.schedule(async () => {
      ran = true;
    });
    await scheduler.flush();
    expect(ran).toBe(true);
    scheduler.dispose();
  });
});
