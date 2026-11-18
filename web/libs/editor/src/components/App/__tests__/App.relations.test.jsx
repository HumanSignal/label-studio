/**
 * Unit tests for how App mounts and feeds the relations overlay.
 *
 * The overlay used to be given a fresh random key on every render, which
 * remounted the whole relations subtree - and with it every region watcher -
 * each time any observable App reads changed.
 */
import { createRef } from "react";
import App from "../App";

const selectedStore = () => ({ id: "ann-1", relationStore: {}, names: new Map() });

const appContext = () => ({
  props: { store: { task: { data: {} } } },
  relationsRef: createRef(),
});

describe("App relations overlay", () => {
  it("keeps a stable element identity for the overlay across renders", () => {
    const context = appContext();
    const annotation = selectedStore();

    const first = App.prototype.renderRelations.call(context, annotation);
    const second = App.prototype.renderRelations.call(context, annotation);

    expect(first.key).toBeNull();
    expect(second.key).toBe(first.key);
  });

  describe("_notifyScroll", () => {
    let frames;
    let rafSpy;
    let cafSpy;

    beforeEach(() => {
      frames = [];
      rafSpy = spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => frames.push(cb));
      cafSpy = spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
    });

    afterEach(() => {
      rafSpy.mockRestore();
      cafSpy.mockRestore();
    });

    it("coalesces a burst of scroll events into a single overlay update", () => {
      const onResize = mock();
      const app = new App({ store: {} });

      app.relationsRef = { current: { onResize } };

      app._notifyScroll();
      app._notifyScroll();
      app._notifyScroll();

      expect(rafSpy).toHaveBeenCalledTimes(1);
      expect(onResize).not.toHaveBeenCalled();

      frames.forEach((frame) => frame());

      expect(onResize).toHaveBeenCalledTimes(1);

      // Once the frame ran, the next scroll schedules again.
      app._notifyScroll();
      expect(rafSpy).toHaveBeenCalledTimes(2);
    });

    it("does not blow up when the overlay is gone by the time the frame runs", () => {
      const app = new App({ store: {} });

      app.relationsRef = { current: null };
      app._notifyScroll();

      expect(() => frames.forEach((frame) => frame())).not.toThrow();
    });
  });
});
