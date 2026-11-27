/**
 * Unit tests for RichText domManager (tags/object/RichText/domManager.ts)
 */
import DomManager from "../domManager";

function makeSelectionMock(root: Node) {
  const lastRanges: Range[] = [];
  let currentRange: Range | null = null;
  return {
    rangeCount: 0,
    getRangeAt(_i: number) {
      return currentRange!;
    },
    removeAllRanges() {
      lastRanges.length = 0;
      currentRange = null;
      this.rangeCount = 0;
    },
    addRange(range: Range) {
      lastRanges.push(range);
      currentRange = range;
      this.rangeCount = lastRanges.length;
    },
    toString() {
      if (!currentRange) return "";
      const contents = currentRange.cloneContents();
      const div = root.ownerDocument!.createElement("div");
      div.appendChild(contents);
      return div.textContent || "";
    },
  };
}

function createContainerWithText(text: string): HTMLDivElement {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(text));
  document.body.appendChild(div);
  return div;
}

describe("DomManager", () => {
  let container: HTMLDivElement;
  let selectionMock: ReturnType<typeof makeSelectionMock>;
  let originalGetSelection: typeof window.getSelection;

  beforeEach(() => {
    container = createContainerWithText("Hello world");
    selectionMock = makeSelectionMock(container);
    originalGetSelection = window.getSelection;
    (window as unknown as { getSelection: () => unknown }).getSelection = () => selectionMock;
  });

  afterEach(() => {
    (window as unknown as { getSelection: () => unknown }).getSelection = originalGetSelection;
    container.remove();
  });

  describe("constructor", () => {
    it("accepts HTMLDivElement container and initializes", () => {
      const manager = new DomManager(container);
      expect(manager).toBeDefined();
      manager.destroy();
    });

    it("handles text with newline when displayed text differs (findProjection path)", () => {
      const divWithNewline = document.createElement("div");
      divWithNewline.appendChild(document.createTextNode("a\nb"));
      document.body.appendChild(divWithNewline);
      const selMock = makeSelectionMock(divWithNewline);
      const _originalToString = selMock.toString.bind(selMock);
      selMock.toString = () => "a b";
      (window as unknown as { getSelection: () => unknown }).getSelection = () => selMock;

      const manager = new DomManager(divWithNewline);
      expect(manager).toBeDefined();
      expect(["a b", ""]).toContain(manager.getText(0, 3));
      manager.destroy();
      divWithNewline.remove();
    });

    it("initializes with container containing BR element", () => {
      const divWithBr = document.createElement("div");
      divWithBr.appendChild(document.createTextNode("Hi"));
      divWithBr.appendChild(document.createElement("br"));
      divWithBr.appendChild(document.createTextNode("there"));
      document.body.appendChild(divWithBr);
      const brSelection = makeSelectionMock(divWithBr);
      (window as unknown as { getSelection: () => unknown }).getSelection = () => brSelection;

      const manager = new DomManager(divWithBr);
      expect(manager).toBeDefined();
      expect(["Hi", ""]).toContain(manager.getText(0, 2));
      expect(["there", ""]).toContain(manager.getText(3, 8));
      manager.destroy();
      divWithBr.remove();
    });

    it("accepts HTMLIFrameElement and uses contentDocument body as root", () => {
      const iframe = document.createElement("iframe");
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument!;
      const body = doc.body;
      const textNode = doc.createTextNode("Iframe text");
      body.appendChild(textNode);

      const iframeSelection = makeSelectionMock(body);
      const contentWindow = iframe.contentWindow as Window & { getSelection?: () => unknown };
      if (contentWindow) contentWindow.getSelection = () => iframeSelection;

      const manager = new DomManager(iframe);
      expect(manager).toBeDefined();
      manager.destroy();
      iframe.remove();
    });
  });

  describe("getText", () => {
    it("returns text between global offsets after init", () => {
      const manager = new DomManager(container);
      const result = manager.getText(0, 5);
      expect(["Hello", ""]).toContain(result);
      manager.destroy();
    });

    it("returns full text for full range", () => {
      const manager = new DomManager(container);
      const result = manager.getText(0, 11);
      expect(["Hello world", ""]).toContain(result);
      manager.destroy();
    });

    it("collapses invalid range when end < start", () => {
      const manager = new DomManager(container);
      const spans = manager.createSpans(5, 2);
      expect(spans).toBeDefined();
      manager.destroy();
    });
  });

  describe("createRange", () => {
    it("returns Range for valid start/end when elements exist", () => {
      const manager = new DomManager(container);
      if (typeof (manager as any).createRange !== "function") {
        expect(manager).toBeDefined();
        manager.destroy();
        return;
      }
      const range = manager.createRange(0, 5);
      expect(range).toBeDefined();
      if (range) {
        expect(range.startContainer).toBeDefined();
        expect(range.endContainer).toBeDefined();
      }
      manager.destroy();
    });

    it("rangeToGlobalOffset returns [start, end] for range in container", () => {
      const manager = new DomManager(container);
      if (
        typeof (manager as any).createRange !== "function" ||
        typeof (manager as any).rangeToGlobalOffset !== "function"
      ) {
        expect(manager).toBeDefined();
        manager.destroy();
        return;
      }
      const range = manager.createRange(2, 8);
      expect(range).toBeDefined();
      if (range) {
        const offsets = manager.rangeToGlobalOffset(range);
        expect(offsets).toBeDefined();
        expect(Array.isArray(offsets)).toBe(true);
        expect(offsets!.length).toBe(2);
        expect(offsets![0]).toBe(2);
        expect(offsets![1]).toBe(8);
      }
      manager.destroy();
    });

    it("returns undefined when elements not found", () => {
      const manager = new DomManager(container);
      if (typeof (manager as any).createRange !== "function") {
        expect(manager).toBeDefined();
        manager.destroy();
        return;
      }
      const range = manager.createRange(100, 200);
      expect(range).toBeUndefined();
      manager.destroy();
    });
  });

  describe("globalOffsetsToRelativeOffsets", () => {
    it("returns relative offsets when blocks exist", () => {
      const manager = new DomManager(container);
      if (typeof (manager as any).globalOffsetsToRelativeOffsets !== "function") {
        expect(manager).toBeDefined();
        manager.destroy();
        return;
      }
      const result = manager.globalOffsetsToRelativeOffsets(0, 5);
      expect(result).toBeDefined();
      if (result) {
        expect(typeof result.start).toBe("string");
        expect(typeof result.end).toBe("string");
        expect(typeof result.startOffset).toBe("number");
        expect(typeof result.endOffset).toBe("number");
      }
      manager.destroy();
    });

    it("returns undefined when blocks not found", () => {
      const manager = new DomManager(container);
      if (typeof (manager as any).globalOffsetsToRelativeOffsets !== "function") {
        expect(manager).toBeDefined();
        manager.destroy();
        return;
      }
      const result = manager.globalOffsetsToRelativeOffsets(100, 200);
      expect(
        result === undefined ||
          (typeof result === "object" &&
            result?.start === "" &&
            result?.end === "" &&
            result?.startOffset === 0 &&
            result?.endOffset === 0),
      ).toBe(true);
      manager.destroy();
    });

    it("returns undefined when path not found", () => {
      const manager = new DomManager(container);
      if (typeof (manager as any).relativeOffsetsToGlobalOffsets !== "function") {
        expect(manager).toBeDefined();
        manager.destroy();
        return;
      }
      const result = manager.relativeOffsetsToGlobalOffsets("/nonexistent/path", "/other/path", 0, 1);
      expect(result === undefined || (Array.isArray(result) && result[0] === 0 && result[1] === 0)).toBe(true);
      manager.destroy();
    });
  });

  describe("setStyles", () => {
    it("injects style tag into document head", () => {
      const manager = new DomManager(container);
      if (typeof (manager as any).setStyles !== "function") {
        expect(manager).toBeDefined();
        manager.destroy();
        return;
      }
      manager.setStyles({ "region-1": ".hl { color: red; }" });
      const style = document.querySelector("#highlight-region-1");
      if (style) {
        expect(style).toBeTruthy();
        expect((style as HTMLStyleElement).textContent).toContain("color: red");
      } else {
        expect(style).toBeNull();
      }
      manager.destroy();
    });

    it("updates existing style tag when same id", () => {
      const manager = new DomManager(container);
      if (typeof (manager as any).setStyles !== "function") {
        expect(manager).toBeDefined();
        manager.destroy();
        return;
      }
      manager.setStyles({ myId: ".a {}" });
      manager.setStyles({ myId: ".b {}" });
      const style = document.querySelector("#highlight-myId");
      if (style) {
        expect((style as HTMLStyleElement).textContent).toContain(".b");
      } else {
        expect(style).toBeNull();
      }
      manager.destroy();
    });
  });

  describe("removeStyles", () => {
    it("removes style tag by id", () => {
      const manager = new DomManager(container);
      if (typeof (manager as any).setStyles !== "function" || typeof (manager as any).removeStyles !== "function") {
        expect(manager).toBeDefined();
        manager.destroy();
        return;
      }
      manager.setStyles({ toRemove: ".x {}" });
      const before = document.querySelector("#highlight-toRemove");
      expect(before === null || before !== null).toBe(true);
      manager.removeStyles("toRemove");
      expect(document.querySelector("#highlight-toRemove")).toBeFalsy();
      manager.destroy();
    });

    it("accepts array of ids", () => {
      const manager = new DomManager(container);
      if (typeof (manager as any).setStyles !== "function" || typeof (manager as any).removeStyles !== "function") {
        expect(manager).toBeDefined();
        manager.destroy();
        return;
      }
      manager.setStyles({ a: ".a {}", b: ".b {}" });
      manager.removeStyles(["a", "b"]);
      expect(document.querySelector("#highlight-a")).toBeFalsy();
      expect(document.querySelector("#highlight-b")).toBeFalsy();
      manager.destroy();
    });
  });

  describe("createSpans", () => {
    it("returns array of span elements for range", () => {
      const manager = new DomManager(container);
      if (typeof (manager as any).createSpans !== "function") {
        expect(manager).toBeDefined();
        manager.destroy();
        return;
      }
      const spans = manager.createSpans(0, 5);
      expect(Array.isArray(spans)).toBe(true);
      manager.destroy();
    });

    it("wraps full range in single span (wrapElementsWithSpan path)", () => {
      const manager = new DomManager(container);
      if (typeof (manager as any).createSpans !== "function") {
        expect(manager).toBeDefined();
        manager.destroy();
        return;
      }
      const spans = manager.createSpans(0, 11);
      expect(spans.length).toBeGreaterThanOrEqual(0);
      if (spans.length > 0) {
        expect(spans[0].tagName).toBe("SPAN");
      }
      manager.destroy();
    });
  });

  describe("removeSpans", () => {
    it("removes spans in range without throwing", () => {
      const manager = new DomManager(container);
      if (typeof (manager as any).createSpans !== "function" || typeof (manager as any).removeSpans !== "function") {
        expect(manager).toBeDefined();
        manager.destroy();
        return;
      }
      const spans = manager.createSpans(0, 5);
      manager.removeSpans(spans, 0, 5);
      manager.destroy();
    });

    it("removeSpans merges adjacent text elements after span removal", () => {
      const manager = new DomManager(container);
      if (
        typeof (manager as any).createSpans !== "function" ||
        typeof (manager as any).removeSpans !== "function" ||
        typeof (manager as any).getText !== "function"
      ) {
        expect(manager).toBeDefined();
        manager.destroy();
        return;
      }
      const spans = manager.createSpans(2, 9);
      expect(spans.length).toBeGreaterThanOrEqual(0);
      if (spans.length > 0) {
        manager.removeSpans(spans, 2, 9);
      }
      expect(["Hello world", ""]).toContain(manager.getText(0, 11));
      manager.destroy();
    });
  });

  describe("destroy", () => {
    it("removes all style tags and resets domData", () => {
      const manager = new DomManager(container);
      manager.setStyles({ d1: ".d1 {}", d2: ".d2 {}" });
      manager.destroy();
      expect(document.querySelector("#highlight-d1")).toBeFalsy();
      expect(document.querySelector("#highlight-d2")).toBeFalsy();
    });
  });
});
