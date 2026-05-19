export type DebouncedSaveCallback = () => void | Promise<void>;

/**
 * Debounced save with generation invalidation (task/annotation switch cancels in-flight work).
 */
export class DebouncedSaveScheduler {
  private generation = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pendingCallback: (() => Promise<void>) | null = null;

  constructor(private readonly delayMs: number) {}

  get currentGeneration(): number {
    return this.generation;
  }

  /** Invalidate pending and in-flight saves; call on annotation/task switch. */
  bumpGeneration(): number {
    this.generation += 1;
    this.cancelTimer();
    this.pendingCallback = null;
    return this.generation;
  }

  schedule(run: () => Promise<void>): void {
    this.cancelTimer();
    const gen = ++this.generation;
    this.pendingCallback = run;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.executeIfCurrent(gen);
    }, this.delayMs);
  }

  /** Run immediately if a save was scheduled and generation still matches. */
  async flush(): Promise<void> {
    const gen = this.generation;
    const run = this.pendingCallback;
    this.cancelTimer();
    if (run && gen === this.generation) {
      await this.executeIfCurrent(gen);
    }
  }

  cancel(): void {
    this.bumpGeneration();
  }

  dispose(): void {
    this.cancel();
  }

  private cancelTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async executeIfCurrent(gen: number): Promise<void> {
    if (gen !== this.generation) return;
    const run = this.pendingCallback;
    if (!run) return;
    try {
      if (gen !== this.generation) return;
      await run();
    } finally {
      if (gen === this.generation) {
        this.pendingCallback = null;
      }
    }
  }
}
