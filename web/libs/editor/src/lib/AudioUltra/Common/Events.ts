import { Destructable } from './Destructable';

type AnyFunction = (...args: any[]) => any

type ToFunction<T> = T extends AnyFunction ? T : never;

export class Events<ET, ETS extends keyof ET = keyof ET> extends Destructable {
  private subscriptions = new Map<ETS, Set<any>>();

  on<T extends ETS>(eventName: T, handler: ET[T]) {
    const events = this.getSubscriptions(eventName);

    if (events.has(handler) === false) {
      events.add(handler);
    }
  }

  off<T extends ETS>(eventName: T, handler: ET[T]) {
    const events = this.getSubscriptions(eventName);

    if (events.has(handler)) {
      events.delete(handler);
    }
  }

  invoke<T extends ETS, ETF = ET[T]>(eventName: T, args?: Parameters<ToFunction<ETF>>) {
    const events = this.getSubscriptions(eventName);

    events.forEach(evt => evt(...(args ?? [])));
  }

  removeAllListeners() {
    this.subscriptions.forEach(sub => sub.clear());
    this.subscriptions.clear();
  }

  destroy(): void {
    this.removeAllListeners();

    this.on = () => null;
    this.off = () => null;
    this.invoke = () => null;
    this.removeAllListeners = () => null;

    super.destroy();
  }

  private getSubscriptions<T extends ETS>(eventName: T) {
    const events = this.subscriptions.get(eventName) ?? new Set<ET[T]>();

    this.subscriptions.set(eventName, events);

    return events;
  }
}
