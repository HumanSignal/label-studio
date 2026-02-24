/**
 * Unit tests for env/production.js (Codecov: critical -73% delta).
 */
import production from "../production";

describe("env/production", () => {
  describe("getData", () => {
    it("returns task with stringified data when task has data", () => {
      const task = { id: 1, data: { text: "hi" } };
      const result = production.getData(task);
      expect(result).toEqual({ id: 1, data: '{"text":"hi"}' });
    });

    it("returns task unchanged when no data property", () => {
      const task = { id: 1 };
      expect(production.getData(task)).toBe(task);
    });

    it("returns falsy input as-is", () => {
      expect(production.getData(null)).toBeNull();
      expect(production.getData(undefined)).toBeUndefined();
    });
  });

  describe("getState", () => {
    it("returns annotations, completions, predictions from task", () => {
      const task = { annotations: [{}], completions: [], predictions: [{}] };
      expect(production.getState(task)).toEqual({
        annotations: [{}],
        completions: [],
        predictions: [{}],
      });
    });

    it("handles missing task", () => {
      expect(production.getState(undefined)).toEqual({
        annotations: undefined,
        completions: undefined,
        predictions: undefined,
      });
    });
  });

  describe("rootElement", () => {
    it("returns element when given string id and element exists", () => {
      const el = document.createElement("div");
      el.id = "root-el";
      document.body.appendChild(el);
      const root = production.rootElement("root-el");
      expect(root).toBe(el);
      expect(root.innerHTML).toBe("");
      document.body.removeChild(el);
    });

    it("returns and clears element when given DOM element", () => {
      const el = document.createElement("div");
      el.innerHTML = "<span>old</span>";
      const root = production.rootElement(el);
      expect(root).toBe(el);
      expect(root.innerHTML).toBe("");
    });
  });

  describe("configureApplication", () => {
    it("returns options with External fallbacks when no callbacks provided", () => {
      const result = production.configureApplication({});
      expect(result.settings).toEqual({});
      expect(result.messages).toBeDefined();
      expect(typeof result.onSubmitAnnotation).toBe("function");
      expect(typeof result.onUpdateAnnotation).toBe("function");
      expect(typeof result.onDeleteAnnotation).toBe("function");
      expect(result.forceAutoAnnotation).toBe(false);
      expect(result.forceAutoAcceptSuggestions).toBe(false);
    });

    it("uses params callback when onSubmitAnnotation provided", () => {
      const onSubmit = jest.fn();
      const result = production.configureApplication({
        onSubmitAnnotation: onSubmit,
      });
      expect(result.onSubmitAnnotation).toBe(onSubmit);
    });

    it("uses submitAnnotation as alias when both submitAnnotation and onSubmitAnnotation provided", () => {
      const onSubmit = jest.fn();
      const result = production.configureApplication({
        submitAnnotation: onSubmit,
        onSubmitAnnotation: onSubmit,
      });
      expect(result.onSubmitAnnotation).toBe(onSubmit);
    });

    it("uses onSelectAnnotation when provided", () => {
      const onSelect = jest.fn();
      const result = production.configureApplication({
        onSelectAnnotation: onSelect,
      });
      expect(result.onSelectAnnotation).toBe(onSelect);
    });

    it("merges params.settings and params.messages", () => {
      const result = production.configureApplication({
        settings: { key: "value" },
        messages: { CUSTOM: "Custom" },
      });
      expect(result.settings).toEqual({ key: "value" });
      expect(result.messages.CUSTOM).toBe("Custom");
    });
  });
});
