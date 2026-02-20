import { render, fireEvent } from "@testing-library/react";
import { ResultItem, RegionDetailsMain, RegionDetailsMeta } from "../RegionDetails";

jest.mock("../RegionEditor", () => ({
  RegionEditor: () => null,
}));

describe("RegionDetails", () => {
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
      expect(container.textContent).toContain("Sample text");
      expect(container.textContent).toContain("5");
    });

    it("filters results by canBeSubmitted", () => {
      const region = {
        results: [
          { pid: "1", canBeSubmitted: false, type: "rating", mainValue: ["1"] },
          { pid: "2", canBeSubmitted: true, type: "rating", mainValue: ["2"] },
        ],
      };
      const { container } = render(<RegionDetailsMain region={region} />);
      expect(container.textContent).toContain("2");
      expect(container.textContent).not.toContain("1");
    });
  });

  describe("RegionDetailsMeta", () => {
    it("renders meta text when not in edit mode", () => {
      const region = { meta: { text: "Meta content" } };
      const { getByText } = render(<RegionDetailsMeta region={region} editMode={false} />);
      expect(getByText("Meta content")).toBeInTheDocument();
    });

    it("renders textarea when in edit mode", () => {
      const region = { meta: { text: "Edit me" } };
      const { container } = render(
        <RegionDetailsMeta region={region} editMode={true} cancelEditMode={jest.fn()} enterEditMode={jest.fn()} />,
      );
      const textarea = container.querySelector("textarea");
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue("Edit me");
    });

    it("calls saveMeta and cancelEditMode on blur", () => {
      const setMetaText = jest.fn();
      const cancelEditMode = jest.fn();
      const region = { meta: { text: "Meta" }, setMetaText };
      const { container } = render(
        <RegionDetailsMeta region={region} editMode={true} cancelEditMode={cancelEditMode} enterEditMode={jest.fn()} />,
      );
      const textarea = container.querySelector("textarea");
      fireEvent.blur(textarea as HTMLTextAreaElement);
      expect(setMetaText).toHaveBeenCalledWith("Meta");
      expect(cancelEditMode).toHaveBeenCalled();
    });

    it("calls saveMeta and cancelEditMode on Enter key", () => {
      const setMetaText = jest.fn();
      const cancelEditMode = jest.fn();
      const region = { meta: { text: "Meta" }, setMetaText };
      const { container } = render(
        <RegionDetailsMeta region={region} editMode={true} cancelEditMode={cancelEditMode} enterEditMode={jest.fn()} />,
      );
      const textarea = container.querySelector("textarea");
      fireEvent.keyDown(textarea as HTMLTextAreaElement, { key: "Enter", shiftKey: false });
      expect(setMetaText).toHaveBeenCalledWith("Meta");
      expect(cancelEditMode).toHaveBeenCalled();
    });
  });
});
