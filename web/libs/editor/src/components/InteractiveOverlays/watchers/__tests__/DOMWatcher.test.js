/**
 * Unit tests for DOMWatcher (components/InteractiveOverlays/watchers/DOMWatcher.js)
 */
import { DOMWatcher } from "../DOMWatcher";

describe("DOMWatcher", () => {
  it("observes the region element and disconnects on destroy", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);
    const watcher = new DOMWatcher(document.body, { getRegionElement: () => element }, mock());
    const disconnect = spyOn(watcher.observer, "disconnect");

    watcher.destroy();

    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(watcher.observer).toBeNull();
    element.remove();
  });

  it("does not throw when the region had no element to observe", () => {
    const watcher = new DOMWatcher(document.body, { getRegionElement: () => undefined }, mock());

    expect(() => watcher.destroy()).not.toThrow();
  });

  it("is idempotent", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);
    const watcher = new DOMWatcher(document.body, { getRegionElement: () => element }, mock());

    watcher.destroy();

    expect(() => watcher.destroy()).not.toThrow();
    element.remove();
  });
});
