/**
 * Unit tests for createPropertyWatcher (components/InteractiveOverlays/watchers/PropertyWatcher.js)
 *
 * These cover the contract RelationShape.destroy() relies on: a watcher that is
 * destroyed must stop observing, so relations cannot accumulate MobX observers.
 */
import { observable } from "mobx";
import { createPropertyWatcher } from "../PropertyWatcher";

// The watcher debounces its callback by 10ms.
const afterDebounce = () => new Promise((resolve) => setTimeout(resolve, 30));

describe("createPropertyWatcher", () => {
  it("calls back when a watched property changes", async () => {
    const callback = mock();
    const element = observable({ x: 1, y: 2 });
    const Watcher = createPropertyWatcher(["x"]);
    const watcher = new Watcher(document.body, element, callback);

    callback.mockClear();
    element.x = 10;
    await afterDebounce();

    expect(callback).toHaveBeenCalled();
    watcher.destroy();
  });

  it("stops observing once destroyed", async () => {
    const callback = mock();
    const element = observable({ x: 1 });
    const Watcher = createPropertyWatcher(["x"]);
    const watcher = new Watcher(document.body, element, callback);

    watcher.destroy();
    callback.mockClear();
    element.x = 10;
    await afterDebounce();

    expect(callback).not.toHaveBeenCalled();
  });

  it("does not accumulate observers across repeated construction", async () => {
    const callback = mock();
    const element = observable({ x: 1 });
    const Watcher = createPropertyWatcher(["x"]);

    // Stand-in for the overlay re-rendering: build many watchers, destroy them all.
    const watchers = Array.from({ length: 10 }, () => new Watcher(document.body, element, callback));
    watchers.forEach((watcher) => watcher.destroy());

    callback.mockClear();
    element.x = 10;
    await afterDebounce();

    expect(callback).not.toHaveBeenCalled();

    const live = new Watcher(document.body, element, callback);

    callback.mockClear();
    element.x = 20;
    await afterDebounce();

    expect(callback).toHaveBeenCalledTimes(1);
    live.destroy();
  });

  it("is idempotent and safe when a disposer throws", () => {
    const element = observable({ x: 1 });
    const Watcher = createPropertyWatcher(["x"]);
    const watcher = new Watcher(document.body, element, mock());

    watcher.disposers = [
      () => {
        throw new Error("node is already dead");
      },
    ];

    expect(() => watcher.destroy()).not.toThrow();
    expect(() => watcher.destroy()).not.toThrow();
  });

  it("registers one observer per property for array properties", () => {
    const callback = mock();
    const element = observable({
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
    });
    const Watcher = createPropertyWatcher([{ points: ["x", "y"] }]);
    const watcher = new Watcher(document.body, element, callback);

    // 3 points x 2 properties, plus one observer on the array itself.
    expect(watcher.disposers).toHaveLength(7);
    watcher.destroy();
  });

  it("notices points added after the watcher was built", async () => {
    const callback = mock();
    const element = observable({ points: [{ x: 0, y: 0 }] });
    const Watcher = createPropertyWatcher([{ points: ["x", "y"] }]);
    const watcher = new Watcher(document.body, element, callback);

    callback.mockClear();
    element.points.push({ x: 5, y: 5 });
    await afterDebounce();

    expect(callback).toHaveBeenCalled();
    watcher.destroy();
  });
});
