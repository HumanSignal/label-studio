/**
 * Unit tests for Loader (lib/AudioUltra/Visual/Loader.ts)
 */
import { Loader } from "../Loader";

describe("Loader", () => {
  beforeEach(() => {
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
      (cb as (time: number) => void)(0);
      return 0;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function flushRaf() {
    // rAF callback runs synchronously in mock
  }

  describe("constructor", () => {
    it("creates element with shadow root and progress UI", () => {
      const loader = new Loader();
      expect(loader.shadowRoot).toBeTruthy();
      expect(loader.shadowRoot?.querySelector(".progress-bar")).toBeTruthy();
      expect(loader.shadowRoot?.querySelector("#text")?.textContent).toContain("Loading file");
      expect(loader.shadowRoot?.querySelector("#loaded")?.textContent).toContain("0.0 MB");
      expect(loader.shadowRoot?.querySelector("#total")?.textContent).toContain("?? MB");
    });

    it("initializes _loaded and _total to 0", () => {
      const loader = new Loader();
      expect(loader.loaded).toBe(0);
      expect(loader.total).toBe(0);
    });
  });

  describe("error getter and setter", () => {
    it("returns and sets _error", () => {
      const loader = new Loader();
      expect(loader.error).toBe("");
      loader.error = "Something failed";
      expect(loader.error).toBe("Something failed");
    });
  });

  describe("loaded getter and setter", () => {
    it("returns and sets _loaded", () => {
      const loader = new Loader();
      loader.loaded = 1024 * 1024;
      expect(loader.loaded).toBe(1024 * 1024);
    });
  });

  describe("total getter and setter", () => {
    it("returns and sets _total", () => {
      const loader = new Loader();
      loader.total = 2 * 1024 * 1024;
      expect(loader.total).toBe(2 * 1024 * 1024);
    });
  });

  describe("value getter", () => {
    it("returns rounded percentage of loaded over total", () => {
      const loader = new Loader();
      loader.loaded = 50;
      loader.total = 100;
      expect(loader.value).toBe(50);
    });

    it("returns 100 when loaded equals total", () => {
      const loader = new Loader();
      loader.loaded = 100;
      loader.total = 100;
      expect(loader.value).toBe(100);
    });

    it("returns 0 when loaded is 0", () => {
      const loader = new Loader();
      loader.loaded = 0;
      loader.total = 100;
      expect(loader.value).toBe(0);
    });
  });

  describe("convertBytesToMegabytes", () => {
    it("converts bytes to one decimal MB string", () => {
      const loader = new Loader();
      expect(loader.convertBytesToMegabytes(0)).toBe("0.0");
      expect(loader.convertBytesToMegabytes(1024 * 1024)).toBe("1.0");
      expect(loader.convertBytesToMegabytes(2.5 * 1024 * 1024)).toBe("2.5");
    });
  });

  describe("update", () => {
    it("returns early when shadowRoot is null", () => {
      const loader = new Loader();
      Object.defineProperty(loader, "shadowRoot", { value: null, configurable: true });
      loader.update();
      expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    });

    it("returns early when progress-bar element is missing", () => {
      const loader = new Loader();
      loader.shadowRoot!.innerHTML = "<div>no bar</div>";
      loader.update();
      flushRaf();
      expect(loader.shadowRoot?.querySelector(".progress-bar")).toBeFalsy();
    });

    it("shows error message and adds error class when _error is set", () => {
      const loader = new Loader();
      loader.error = "Load failed";
      loader.update();
      flushRaf();
      const text = loader.shadowRoot?.querySelector("#text") as HTMLElement;
      expect(text?.classList.contains("error")).toBe(true);
      expect(text?.innerText).toBe("Load failed");
    });

    it("does not add error class twice when already present", () => {
      const loader = new Loader();
      loader.error = "Err";
      loader.update();
      flushRaf();
      loader.update();
      flushRaf();
      const text = loader.shadowRoot?.querySelector("#text") as HTMLElement;
      expect(text?.classList.contains("error")).toBe(true);
      expect(text?.classList.length).toBe(2); // progress-text + error
    });

    it("shows chunks and percentage when _initializing is true", () => {
      const loader = new Loader();
      (loader as any)._initializing = true;
      loader.loaded = 5;
      loader.total = 10;
      loader.update();
      const loadedEl = loader.shadowRoot?.querySelector("#loaded") as HTMLElement;
      const totalEl = loader.shadowRoot?.querySelector("#total") as HTMLElement;
      const pctEl = loader.shadowRoot?.querySelector("#percentage") as HTMLElement;
      expect(loadedEl?.innerText).toBe("5");
      expect(totalEl?.innerText).toBe("10 chunks");
      expect(pctEl?.innerText).toBe("(50%)");
    });

    it("shows indeterminate bar and MB when total < 0 and loaded > 0", () => {
      const loader = new Loader();
      loader.total = -1;
      loader.loaded = 2 * 1024 * 1024;
      loader.update();
      const bar = loader.shadowRoot?.querySelector(".progress-bar") as HTMLElement;
      expect(bar?.classList.contains("progress-bar-indeterminate")).toBe(true);
      const loadedEl = loader.shadowRoot?.querySelector("#loaded") as HTMLElement;
      expect(loadedEl?.innerText).toBe("2.0 MB");
    });

    it("adds indeterminate class only once when total < 0", () => {
      const loader = new Loader();
      loader.total = -1;
      loader.loaded = 0;
      loader.update();
      const bar = loader.shadowRoot?.querySelector(".progress-bar") as HTMLElement;
      expect(bar?.classList.contains("progress-bar-indeterminate")).toBe(true);
      loader.update();
      expect(bar?.classList.contains("progress-bar-indeterminate")).toBe(true);
    });

    it("sets initializing state and shows Initializing when value is 100", () => {
      const loader = new Loader();
      loader.loaded = 10 * 1024 * 1024;
      loader.total = 10 * 1024 * 1024;
      loader.update();
      expect((loader as any)._initializing).toBe(true);
      const textEl = loader.shadowRoot?.querySelector("#text") as HTMLElement;
      const loadedEl = loader.shadowRoot?.querySelector("#loaded") as HTMLElement;
      const totalEl = loader.shadowRoot?.querySelector("#total") as HTMLElement;
      const pctEl = loader.shadowRoot?.querySelector("#percentage") as HTMLElement;
      expect(textEl?.innerText).toBe("Initializing...");
      expect(loadedEl?.innerText).toBe("10.0 MB");
      expect(totalEl?.innerText).toBe("10.0 MB");
      expect(pctEl?.innerText).toBe("(100%)");
      const barEl = loader.shadowRoot?.querySelector(".progress-bar") as HTMLElement;
      expect(barEl?.classList.contains("progress-bar-indeterminate")).toBe(true);
    });

    it("updates progress bar position and text for normal progress", () => {
      const loader = new Loader();
      loader.loaded = 5 * 1024 * 1024;
      loader.total = 10 * 1024 * 1024;
      loader.update();
      const bar = loader.shadowRoot?.querySelector(".progress-bar") as HTMLElement;
      expect(bar?.style.getPropertyValue("--ls-loader-position")).toBe("-50%");
      const pctEl = loader.shadowRoot?.querySelector("#percentage") as HTMLElement;
      const loadedEl = loader.shadowRoot?.querySelector("#loaded") as HTMLElement;
      const totalEl = loader.shadowRoot?.querySelector("#total") as HTMLElement;
      expect(pctEl?.innerText).toBe("(50%)");
      expect(loadedEl?.innerText).toBe("5.0 MB");
      expect(totalEl?.innerText).toBe("10.0 MB");
    });

    it("does not set percentage when value is 0", () => {
      const loader = new Loader();
      loader.loaded = 0;
      loader.total = 100 * 1024 * 1024;
      loader.update();
      const pctEl = loader.shadowRoot?.querySelector("#percentage");
      expect(pctEl?.textContent).toBe("(0)%");
    });

    it("does not set loaded/total text when they are 0", () => {
      const loader = new Loader();
      loader.loaded = 0;
      loader.total = 0;
      loader.update();
      expect(loader.shadowRoot?.querySelector("#loaded")?.textContent).toContain("0.0");
      expect(loader.shadowRoot?.querySelector("#total")?.textContent).toContain("??");
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
      expect(el).toBeInstanceOf(Loader);
    });
  });
});
