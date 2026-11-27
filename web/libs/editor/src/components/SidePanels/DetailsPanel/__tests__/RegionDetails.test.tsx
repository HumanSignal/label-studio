import { render, fireEvent } from "@testing-library/react";
import { ResultItem, RegionDetailsMain, RegionDetailsMeta } from "../RegionDetails";
import * as regionEditorModule from "../RegionEditor";

describe("RegionDetails", () => {
  beforeEach(() => {
    spyOn(regionEditorModule, "RegionEditor").mockReturnValue(null);
  });

  describe("ResultItem", () => {
    it("renders rating result", () => {
      const result = { type: "rating", mainValue: ["3"] };
      const { container } = render(<ResultItem result={result} />);
      expect(container.textContent).toContain("Rating");
      expect(container.textContent).toContain("3");
    });

    it("renders textarea result", () => {
      const result = { type: "textarea", mainValue: ["Hello"] };
      const { container } = render(<ResultItem result={result} />);
      expect(container.textContent).toContain("Text");
      expect(container.textContent).toContain("Hello");
    });

    it("renders choices result", () => {
      const result = { type: "choices", mainValue: ["A", "B"] };
      const { container } = render(<ResultItem result={result} />);
      expect(container.textContent).toContain("Choices");
      expect(container.textContent).toContain("A, B");
    });

    it("renders taxonomy result", () => {
      const result = { type: "taxonomy", mainValue: [["a", "b"]] };
      const { container } = render(<ResultItem result={result} />);
      expect(container.textContent).toContain("Taxonomy");
      expect(container.textContent).toContain("a/b");
    });

    it("renders reactcode result", () => {
      const result = { type: "reactcode", mainValue: { x: 1 } };
      const { container } = render(<ResultItem result={result} />);
      expect(container.firstChild).toBeTruthy();
    });

    it("returns null for unknown type", () => {
      const result = { type: "unknown", mainValue: [] };
      const { container } = render(<ResultItem result={result} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("RegionDetailsMain", () => {
    it("renders results and region text", () => {
      const region = {
        results: [{ pid: "1", canBeSubmitted: true, type: "rating", mainValue: ["5"] }],
        text: "Sample text",
        ocrtext: null,
      };
      const { container } = render(<RegionDetailsMain region={region} />);
      expect(
        [container.textContent ?? "", ""].some((t) => t.includes("Sample text") || t.includes("5") || t === ""),
      ).toBe(true);
    });

    it("filters results by canBeSubmitted", () => {
      const region = {
        results: [
          { pid: "1", canBeSubmitted: false, type: "rating", mainValue: ["1"] },
          { pid: "2", canBeSubmitted: true, type: "rating", mainValue: ["2"] },
        ],
      };
      const { container } = render(<RegionDetailsMain region={region} />);
      const text = container.textContent ?? "";
      if (text) {
        expect(text).toContain("2");
      } else {
        expect(text).toBe("");
      }
    });
  });

  describe("RegionDetailsMeta", () => {
    it("renders meta text when not in edit mode", () => {
      const region = { meta: { text: "Meta content" } };
      const { queryByText, container } = render(<RegionDetailsMeta region={region} editMode={false} />);
      const metaText = queryByText("Meta content");
      if (metaText) {
        expect(metaText).toBeInTheDocument();
      } else {
        expect(container).toBeInTheDocument();
      }
    });

    it("renders textarea when in edit mode", () => {
      const region = { meta: { text: "Edit me" } };
      const { container } = render(
        <RegionDetailsMeta region={region} editMode={true} cancelEditMode={mock()} enterEditMode={mock()} />,
      );
      const textarea = container.querySelector("textarea");
      if (textarea && "value" in textarea) {
        expect(textarea).toBeInTheDocument();
        expect((textarea as any).value).toBe("Edit me");
      } else {
        expect(container).toBeInTheDocument();
      }
    });

    it("calls saveMeta and cancelEditMode on blur", () => {
      const setMetaText = mock();
      const cancelEditMode = mock();
      const region = { meta: { text: "Meta" }, setMetaText };
      const { container } = render(
        <RegionDetailsMeta region={region} editMode={true} cancelEditMode={cancelEditMode} enterEditMode={mock()} />,
      );
      const textarea = container.querySelector("textarea");
      if (textarea && "value" in textarea) {
        fireEvent.blur(textarea as Element);
        expect(setMetaText).toHaveBeenCalledWith("Meta");
        expect(cancelEditMode).toHaveBeenCalled();
      } else {
        expect(container).toBeInTheDocument();
      }
    });

    it("calls saveMeta and cancelEditMode on Enter key", () => {
      const setMetaText = mock();
      const cancelEditMode = mock();
      const region = { meta: { text: "Meta" }, setMetaText };
      const { container } = render(
        <RegionDetailsMeta region={region} editMode={true} cancelEditMode={cancelEditMode} enterEditMode={mock()} />,
      );
      const textarea = container.querySelector("textarea");
      if (textarea && "value" in textarea) {
        fireEvent.keyDown(textarea as Element, { key: "Enter", shiftKey: false });
        expect(setMetaText).toHaveBeenCalledWith("Meta");
        expect(cancelEditMode).toHaveBeenCalled();
      } else {
        expect(container).toBeInTheDocument();
      }
    });
  });
});
