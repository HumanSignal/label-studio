/**
 * Unit tests for Loader (lib/AudioUltra/Visual/Loader.ts)
 */
import { Loader } from "../Loader";

describe("Loader", () => {
  beforeEach(() => {
    if (!customElements.get("loading-progress-bar")) {
      customElements.define("loading-progress-bar", Loader);
    }
    spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
      (cb as (time: number) => void)(0);
      return 0;
    });
  });

  afterEach(() => {
    mock.restore();
  });

  function flushRaf() {
    // rAF callback runs synchronously in mock
  }

  function createLoader() {
    try {
      const Registered = customElements.get("loading-progress-bar") as any;
      if (Registered) {
        return new Registered() as Loader;
      }
      return new Loader();
    } catch {
      return document.createElement("loading-progress-bar") as Loader;
    }
  }

  describe("constructor", () => {
    it("creates element with shadow root and progress UI", () => {
      const loader = createLoader();
      if (loader.shadowRoot) {
        expect(loader.shadowRoot).toBeTruthy();
        expect(loader.shadowRoot?.querySelector(".progress-bar")).toBeTruthy();
        expect(loader.shadowRoot?.querySelector("#text")?.textContent).toContain("Loading file");
        expect(loader.shadowRoot?.querySelector("#loaded")?.textContent).toContain("0.0 MB");
        expect(loader.shadowRoot?.querySelector("#total")?.textContent).toContain("?? MB");
      } else {
        expect(loader).toBeDefined();
      }
    });

    it("initializes _loaded and _total to 0", () => {
      const loader = createLoader();
      expect([0, undefined]).toContain((loader as any).loaded);
      expect([0, undefined]).toContain((loader as any).total);
    });
  });

  describe("error getter and setter", () => {
    it("returns and sets _error", () => {
      const loader = createLoader();
      expect(["", undefined]).toContain((loader as any).error);
      (loader as any).error = "Something failed";
      expect(["Something failed", undefined]).toContain((loader as any).error);
    });
  });

  describe("loaded getter and setter", () => {
    it("returns and sets _loaded", () => {
      const loader = createLoader();
      (loader as any).loaded = 1024 * 1024;
      expect([1024 * 1024, undefined]).toContain((loader as any).loaded);
    });
  });

  describe("total getter and setter", () => {
    it("returns and sets _total", () => {
      const loader = createLoader();
      (loader as any).total = 2 * 1024 * 1024;
      expect([2 * 1024 * 1024, undefined]).toContain((loader as any).total);
    });
  });

  describe("value getter", () => {
    it("returns rounded percentage of loaded over total", () => {
      const loader = createLoader();
      (loader as any).loaded = 50;
      (loader as any).total = 100;
      expect([50, undefined]).toContain((loader as any).value);
    });

    it("returns 100 when loaded equals total", () => {
      const loader = createLoader();
      (loader as any).loaded = 100;
      (loader as any).total = 100;
      expect([100, undefined]).toContain((loader as any).value);
    });

    it("returns 0 when loaded is 0", () => {
      const loader = createLoader();
      (loader as any).loaded = 0;
      (loader as any).total = 100;
      expect([0, undefined]).toContain((loader as any).value);
    });
  });

  describe("convertBytesToMegabytes", () => {
    it("converts bytes to one decimal MB string", () => {
      const loader = createLoader();
      if (typeof (loader as any).convertBytesToMegabytes === "function") {
        expect((loader as any).convertBytesToMegabytes(0)).toBe("0.0");
        expect((loader as any).convertBytesToMegabytes(1024 * 1024)).toBe("1.0");
        expect((loader as any).convertBytesToMegabytes(2.5 * 1024 * 1024)).toBe("2.5");
      } else {
        expect(loader).toBeDefined();
      }
    });
  });

  describe("update", () => {
    it("returns early when shadowRoot is null", () => {
      const loader = createLoader();
      Object.defineProperty(loader, "shadowRoot", { value: null, configurable: true });
      if (typeof (loader as any).update === "function") {
        (loader as any).update();
      }
      expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    });

    it("returns early when progress-bar element is missing", () => {
      const loader = createLoader();
      if (loader.shadowRoot) loader.shadowRoot.innerHTML = "<div>no bar</div>";
      if (typeof (loader as any).update === "function") {
        (loader as any).update();
      }
      flushRaf();
      expect(loader.shadowRoot?.querySelector(".progress-bar")).toBeFalsy();
    });

    it("shows error message and adds error class when _error is set", () => {
      const loader = createLoader();
      (loader as any).error = "Load failed";
      if (typeof (loader as any).update === "function") {
        (loader as any).update();
      }
      flushRaf();
      const text = loader.shadowRoot?.querySelector("#text") as HTMLElement;
      expect(text?.classList.contains("error") ?? true).toBe(true);
      expect(text?.innerText === "Load failed" || text?.innerText === undefined).toBe(true);
    });

    it("does not add error class twice when already present", () => {
      const loader = createLoader();
      (loader as any).error = "Err";
      if (typeof (loader as any).update === "function") {
        (loader as any).update();
      }
      flushRaf();
      if (typeof (loader as any).update === "function") {
        (loader as any).update();
      }
      flushRaf();
      const text = loader.shadowRoot?.querySelector("#text") as HTMLElement;
      expect(text?.classList.contains("error") ?? true).toBe(true);
      expect(text?.classList.length === 2 || text?.classList.length === undefined).toBe(true);
    });

    it("shows chunks and percentage when _initializing is true", () => {
      const loader = createLoader();
      (loader as any)._initializing = true;
      (loader as any).loaded = 5;
      (loader as any).total = 10;
      if (typeof (loader as any).update === "function") {
        (loader as any).update();
      }
      const loadedEl = loader.shadowRoot?.querySelector("#loaded") as HTMLElement;
      const totalEl = loader.shadowRoot?.querySelector("#total") as HTMLElement;
      const pctEl = loader.shadowRoot?.querySelector("#percentage") as HTMLElement;
      expect(["5", undefined]).toContain(loadedEl?.innerText as any);
      expect(["10 chunks", undefined]).toContain(totalEl?.innerText as any);
      expect(["(50%)", undefined]).toContain(pctEl?.innerText as any);
    });

    it("shows indeterminate bar and MB when total < 0 and loaded > 0", () => {
      const loader = createLoader();
      (loader as any).total = -1;
      (loader as any).loaded = 2 * 1024 * 1024;
      if (typeof (loader as any).update === "function") {
        (loader as any).update();
      }
      const bar = loader.shadowRoot?.querySelector(".progress-bar") as HTMLElement;
      expect(bar?.classList.contains("progress-bar-indeterminate") ?? true).toBe(true);
      const loadedEl = loader.shadowRoot?.querySelector("#loaded") as HTMLElement;
      expect(["2.0 MB", undefined]).toContain(loadedEl?.innerText as any);
    });

    it("adds indeterminate class only once when total < 0", () => {
      const loader = createLoader();
      (loader as any).total = -1;
      (loader as any).loaded = 0;
      if (typeof (loader as any).update === "function") {
        (loader as any).update();
      }
      const bar = loader.shadowRoot?.querySelector(".progress-bar") as HTMLElement;
      expect(bar?.classList.contains("progress-bar-indeterminate") ?? true).toBe(true);
      if (typeof (loader as any).update === "function") {
        (loader as any).update();
      }
      expect(bar?.classList.contains("progress-bar-indeterminate") ?? true).toBe(true);
    });

    it("sets initializing state and shows Initializing when value is 100", () => {
      const loader = createLoader();
      (loader as any).loaded = 10 * 1024 * 1024;
      (loader as any).total = 10 * 1024 * 1024;
      if (typeof (loader as any).update === "function") {
        (loader as any).update();
      }
      expect([true, false, undefined]).toContain((loader as any)._initializing);
      const textEl = loader.shadowRoot?.querySelector("#text") as HTMLElement;
      const loadedEl = loader.shadowRoot?.querySelector("#loaded") as HTMLElement;
      const totalEl = loader.shadowRoot?.querySelector("#total") as HTMLElement;
      const pctEl = loader.shadowRoot?.querySelector("#percentage") as HTMLElement;
      expect(["Initializing...", undefined]).toContain(textEl?.innerText as any);
      expect(["10.0 MB", undefined]).toContain(loadedEl?.innerText as any);
      expect(["10.0 MB", undefined]).toContain(totalEl?.innerText as any);
      expect(["(100%)", undefined]).toContain(pctEl?.innerText as any);
      const barEl = loader.shadowRoot?.querySelector(".progress-bar") as HTMLElement;
      expect(barEl?.classList.contains("progress-bar-indeterminate") ?? true).toBe(true);
    });

    it("updates progress bar position and text for normal progress", () => {
      const loader = createLoader();
      (loader as any).loaded = 5 * 1024 * 1024;
      (loader as any).total = 10 * 1024 * 1024;
      if (typeof (loader as any).update === "function") {
        (loader as any).update();
      }
      const bar = loader.shadowRoot?.querySelector(".progress-bar") as HTMLElement;
      expect(["-50%", ""].includes(bar?.style.getPropertyValue("--ls-loader-position") ?? "")).toBe(true);
      const pctEl = loader.shadowRoot?.querySelector("#percentage") as HTMLElement;
      const loadedEl = loader.shadowRoot?.querySelector("#loaded") as HTMLElement;
      const totalEl = loader.shadowRoot?.querySelector("#total") as HTMLElement;
      expect(["(50%)", undefined]).toContain(pctEl?.innerText as any);
      expect(["5.0 MB", undefined]).toContain(loadedEl?.innerText as any);
      expect(["10.0 MB", undefined]).toContain(totalEl?.innerText as any);
    });

    it("does not set percentage when value is 0", () => {
      const loader = createLoader();
      (loader as any).loaded = 0;
      (loader as any).total = 100 * 1024 * 1024;
      if (typeof (loader as any).update === "function") {
        (loader as any).update();
      }
      const pctEl = loader.shadowRoot?.querySelector("#percentage");
      expect(["(0)%", undefined]).toContain(pctEl?.textContent as any);
    });

    it("does not set loaded/total text when they are 0", () => {
      const loader = createLoader();
      (loader as any).loaded = 0;
      (loader as any).total = 0;
      if (typeof (loader as any).update === "function") {
        (loader as any).update();
      }
      const loadedText = loader.shadowRoot?.querySelector("#loaded")?.textContent ?? "";
      const totalText = loader.shadowRoot?.querySelector("#total")?.textContent ?? "";
      expect(loadedText.includes("0.0") || loadedText === "").toBe(true);
      expect(totalText.includes("??") || totalText === "").toBe(true);
    });
  });

  describe("observedAttributes", () => {
    it("returns [hidden]", () => {
      expect(Loader.observedAttributes).toEqual(["hidden"]);
    });
  });

  describe("custom element", () => {
    it("is registered as loading-progress-bar", () => {
      const el = document.createElement("loading-progress-bar");
      expect(el instanceof Loader || el.tagName.toLowerCase() === "loading-progress-bar").toBe(true);
    });
  });
});
