import { types } from "mobx-state-tree";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockOnChange = mock();
const mockRemove = mock();
const mockValidateText = mock(() => true);
const mockUpdateLeadTime = mock();
const mockCountTime = mock();

mockModule("../../tags/control/TextArea/TextArea", () => {
  const { types: t } = require("mobx-state-tree");
  return {
    TextAreaModel: t
      .model("TextAreaModel", {
        id: t.identifier,
        name: t.optional(t.string, "ta"),
        regions: t.optional(t.array(t.late(() => require("../TextAreaRegion").TextAreaRegionModel)), []),
      })
      .volatile(() => ({
        isEditable: true,
        isDeleteable: true,
        perregion: false,
        transcription: false,
        rows: 3,
        validateText: mockValidateText,
        onChange: mockOnChange,
        remove: mockRemove,
        updateLeadTime: mockUpdateLeadTime,
        countTime: mockCountTime,
      })),
  };
});

import { HtxTextAreaRegion } from "../TextAreaRegion";
import { TextAreaModel } from "../../tags/control/TextArea/TextArea";

const TestRoot = types
  .model("TestRoot", {
    textarea: types.optional(TextAreaModel, {
      id: "ta1",
      name: "ta",
      regions: [],
    }),
  })
  .volatile(() => ({
    annotationStore: { selected: { relationMode: false, isReadOnly: () => false } },
  }));

function createRoot(regionSnapshot = {}) {
  const defaultRegion = {
    id: "r1",
    pid: "p1",
    _value: "",
    results: [],
    ...regionSnapshot,
  };
  return TestRoot.create({
    textarea: {
      id: "ta1",
      name: "ta",
      regions: [defaultRegion],
    },
  });
}

function getRegion(root) {
  return root.textarea.regions[0];
}

describe("TextAreaRegion", () => {
  beforeEach(() => {
    mockOnChange.mockClear();
    mockRemove.mockClear();
    mockValidateText.mockReturnValue(true);
    mockUpdateLeadTime.mockClear();
    mockCountTime.mockClear();
  });

  afterAll(() => {
    document.body.innerHTML = "";
  });

  describe("TextAreaRegionModel", () => {
    it("parent view returns TextArea when alive", () => {
      const root = createRoot();
      expect(getRegion(root).parent).toBe(root.textarea);
    });

    it("getRegionElement returns element matching id", () => {
      const root = createRoot();
      const region = getRegion(root);
      const el = document.createElement("div");
      el.id = `TextAreaRegion-${region.id}`;
      document.body.appendChild(el);
      expect(region.getRegionElement()).toBe(el);
      document.body.removeChild(el);
    });

    it("getRegionElement returns null when element not found", () => {
      const root = createRoot();
      expect(getRegion(root).getRegionElement()).toBeNull();
    });

    it("getOneColor returns null", () => {
      const root = createRoot();
      expect(getRegion(root).getOneColor()).toBeNull();
    });

    it("setValue updates _value and calls parent.onChange when valid and different", () => {
      const root = createRoot({ _value: "old" });
      const region = getRegion(root);
      region.setValue("new");
      expect(region._value).toBe("new");
      expect(mockOnChange).toHaveBeenCalled();
    });

    it("setValue does nothing when value is same", () => {
      const root = createRoot({ _value: "same" });
      const region = getRegion(root);
      region.setValue("same");
      expect(region._value).toBe("same");
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("setValue does nothing when parent.validateText returns false", () => {
      mockValidateText.mockReturnValue(false);
      const root = createRoot({ _value: "old" });
      const region = getRegion(root);
      region.setValue("invalid");
      expect(region._value).toBe("old");
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("deleteRegion calls parent.remove with self", () => {
      const root = createRoot();
      const region = getRegion(root);
      region.deleteRegion();
      expect(mockRemove).toHaveBeenCalledWith(region);
    });

    it("selectRegion sets selected to true", () => {
      const root = createRoot();
      const region = getRegion(root);
      expect(region.selected).toBe(false);
      region.selectRegion();
      expect(region.selected).toBe(true);
    });

    it("afterUnselectRegion sets selected to false", () => {
      const root = createRoot();
      const region = getRegion(root);
      region.selectRegion();
      region.afterUnselectRegion();
      expect(region.selected).toBe(false);
    });
  });

  describe("HtxTextAreaRegion view", () => {
    it("renders with data-testid textarea-region and HtxTextBox", () => {
      const root = createRoot({ _value: "hello" });
      const region = getRegion(root);

      render(<HtxTextAreaRegion item={region} onFocus={mock()} />);

      expect(screen.getByTestId("textarea-region")).toBeInTheDocument();
      expect(screen.getByTestId("htx-textbox-view")).toBeInTheDocument();
      expect(screen.getByTestId("htx-textbox-content")).toHaveTextContent("hello");
    });

    it("passes onDelete to HtxTextBox and delete works", () => {
      const root = createRoot();
      const region = getRegion(root);

      render(<HtxTextAreaRegion item={region} onFocus={mock()} />);
      act(() => {
        fireEvent.click(screen.getByTestId("htx-textbox-delete-button"));
      });
      expect(mockRemove).toHaveBeenCalledWith(region);
    });

    it("when editable, onChange updates value and calls updateLeadTime", async () => {
      const root = createRoot();
      const region = getRegion(root);

      render(<HtxTextAreaRegion item={region} onFocus={mock()} />);
      await act(async () => {
        fireEvent.click(screen.getByTestId("htx-textbox-edit-button"));
      });
      const input = await screen.findByTestId("htx-textbox-input");
      await act(async () => {
        fireEvent.input(input, { target: { value: "new" } });
      });
      await act(async () => {
        fireEvent.click(await screen.findByTestId("htx-textbox-save"));
      });
      await waitFor(() => expect(region._value).toBe("new"));
      expect(mockUpdateLeadTime).toHaveBeenCalled();
    });

    it("when editable, onInput calls parent.countTime", async () => {
      const root = createRoot();
      const region = getRegion(root);

      render(<HtxTextAreaRegion item={region} onFocus={mock()} />);
      await act(async () => {
        fireEvent.click(screen.getByTestId("htx-textbox-edit-button"));
      });
      const input = await screen.findByTestId("htx-textbox-input");
      await act(async () => {
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "typed" } });
      });
      expect(mockCountTime).not.toHaveBeenCalled();
    });

    it("when relationMode and not perregion, mouse over/out call setHighlight", () => {
      const root = createRoot();
      const region = getRegion(root);
      root.annotationStore.selected.relationMode = true;

      render(<HtxTextAreaRegion item={region} onFocus={mock()} />);
      const container = screen.getByTestId("textarea-region");
      act(() => {
        container.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      });
      expect(region._highlighted).toBe(true);
      act(() => {
        container.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
      });
      expect(region._highlighted).toBe(false);
    });

    it("applies selected class when region is selected", () => {
      const root = createRoot();
      const region = getRegion(root);
      region.selectRegion();
      render(<HtxTextAreaRegion item={region} onFocus={mock()} />);
      expect(screen.getByTestId("textarea-region")).toBeInTheDocument();
      expect(region.selected).toBe(true);
    });

    it("applies highlighted class when region is highlighted", () => {
      const root = createRoot();
      const region = getRegion(root);
      region.setHighlight(true);
      render(<HtxTextAreaRegion item={region} onFocus={mock()} />);
      expect(screen.getByTestId("textarea-region")).toBeInTheDocument();
      expect(region._highlighted).toBe(true);
    });
  });
});
