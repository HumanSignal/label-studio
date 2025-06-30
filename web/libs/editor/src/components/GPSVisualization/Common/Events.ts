export class Events<T extends { [K in keyof T]: (...args: any[]) => any }> {
  private handlers: Map<keyof T, Set<(...args: any[]) => void>> = new Map();

  on<K extends keyof T>(event: K, handler: T[K]) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as any);
  }

  off<K extends keyof T>(event: K, handler: T[K]) {
    this.handlers.get(event)?.delete(handler as any);
  }

  invoke<K extends keyof T>(event: K, args: Parameters<T[K]>) {
    this.handlers.get(event)?.forEach((handler) => handler(...args));
  }

  destroy() {
    this.handlers.clear();
  }
}

// Helper type to create event types
// export type EventType<T> = {
//   [K in keyof T]: T[K] extends any[] ? T[K] : [T[K]];
// };
