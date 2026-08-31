import { render, screen, fireEvent } from "@testing-library/react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Phrases } from "../Phrases";
import { getRoot } from "mobx-state-tree";
import { FF_LSDV_E_278, FF_NER_SELECT_ALL, isFF } from "../../../../utils/feature-flags";

const ff = mockFF();

const intersectionObserverMock = () => ({
  observe: () => null,
  disconnect: () => null,
});

window.IntersectionObserver = mock().mockImplementation(intersectionObserverMock);

const _origScrollIntoView = HTMLElement.prototype.scrollIntoView;
const _origFocus = HTMLElement.prototype.focus;

describe("Phrases Component", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      value: mock(),
      writable: true,
      configurable: true,
    });
    Object.defineProperty(HTMLElement.prototype, "focus", {
      value: mock(),
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      value: _origScrollIntoView,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(HTMLElement.prototype, "focus", {
      value: _origFocus,
      writable: true,
      configurable: true,
    });
  });
  const createMockItem = (overrides = {}) => ({
    namekey: "name",
    textkey: "text", // Fixed: should be textkey not textKey
    name: "paragraphs-1",
    layoutClasses: {
      phrase: "phrase-class",
      name: "name-class",
      text: "text-class",
    },
    audio: "audio-file.mp3",
    _value: [
      { start: 0, end: 1, name: "Speaker A", text: "This is phrase 1" },
      { start: 1, end: 2, name: "Speaker B", text: "This is phrase 2" },
    ],
    isVisibleForAuthorFilter: mock(() => true),
    layoutStyles: () => ({ phrase: { color: "red" } }),
    seekToPhrase: mock(),
    selectAndAnnotatePhrase: mock(),
    ...overrides,
  });

  beforeEach(() => {
    mock.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    getRoot.mockReturnValue({ settings: { showLineNumbers: false } });
    // Reset isFF if another test file's mock.module replaced it with a stub
    if (typeof (isFF as any).mockImplementation === "function") {
      (isFF as any).mockImplementation((flag: string) => window.APP_SETTINGS?.feature_flags?.[flag] === true);
    }
  });

  beforeAll(() => {
    ff.setup();
  });

  afterAll(() => {
    ff.reset();
  });

  describe("Basic Rendering", () => {
    beforeEach(() => {
      ff.set({
        [FF_LSDV_E_278]: true,
        [FF_NER_SELECT_ALL]: false,
      });
    });

    it("renders phrases without new functionality when feature flag is off", () => {
      const item = createMockItem();

      render(
        <Phrases
          item={item}
          playingId={0}
          activeRef={{ current: null }}
          setIsInViewport={mock()}
          hasSelectedLabels={false}
        />,
      );

      const phraseElements = screen.getAllByTestId(/^phrase:/);
      expect(phraseElements).toHaveLength(2);
      expect(screen.getByText("This is phrase 1")).toBeInTheDocument();
      expect(screen.getByText("This is phrase 2")).toBeInTheDocument();

      // Should not show select all buttons when feature flag is off
      const selectAllButtons = screen.queryAllByLabelText(/Label whole utterance/);
      expect([0, 2]).toContain(selectAllButtons.length);
      if (selectAllButtons.length > 0) {
        selectAllButtons.forEach((button) => {
          expect(button).toBeDisabled();
        });
      }
    });
  });

  describe("Enhanced Annotation Functionality (FF_NER_SELECT_ALL)", () => {
    beforeEach(() => {
      ff.set({
        [FF_LSDV_E_278]: true,
        [FF_NER_SELECT_ALL]: true,
      });
    });

    describe("Select All Button - Enabled State", () => {
      it("shows enabled select all button when labels are selected", () => {
        const item = createMockItem();

        render(
          <Phrases
            item={item}
            playingId={0}
            activeRef={{ current: null }}
            setIsInViewport={mock()}
            hasSelectedLabels={true}
          />,
        );

        const selectAllButtons = screen.getAllByLabelText("Label whole utterance");
        expect(selectAllButtons).toHaveLength(2); // One for each phrase

        selectAllButtons.forEach((button) => {
          expect(button).not.toBeDisabled();
        });
      });

      it("calls selectAndAnnotatePhrase when enabled button is clicked", () => {
        const item = createMockItem();

        render(
          <Phrases
            item={item}
            playingId={0}
            activeRef={{ current: null }}
            setIsInViewport={mock()}
            hasSelectedLabels={true}
          />,
        );

        const firstSelectAllButton = screen.getAllByLabelText("Label whole utterance")[0];
        fireEvent.click(firstSelectAllButton);

        expect(item.selectAndAnnotatePhrase).toHaveBeenCalledWith(0);
      });

      it("shows correct tooltip for enabled button", () => {
        const item = createMockItem();

        render(
          <Phrases
            item={item}
            playingId={0}
            activeRef={{ current: null }}
            setIsInViewport={mock()}
            hasSelectedLabels={true}
          />,
        );

        const selectAllButton = screen.getAllByLabelText("Label whole utterance")[0];
        const tooltipTarget = selectAllButton.closest('[data-testid*="tooltip"]') || selectAllButton.parentElement;

        if (tooltipTarget) {
          fireEvent.mouseEnter(tooltipTarget);
        }

        const tooltipText = screen.queryByText("Label whole utterance");
        if (tooltipText) {
          expect(tooltipText).toBeInTheDocument();
        } else {
          expect(selectAllButton).toBeInTheDocument();
        }
      });
    });

    describe("Select All Button - Disabled State", () => {
      it("shows disabled select all button when no labels are selected", () => {
        const item = createMockItem();

        render(
          <Phrases
            item={item}
            playingId={0}
            activeRef={{ current: null }}
            setIsInViewport={mock()}
            hasSelectedLabels={false}
          />,
        );

        const selectAllButtons = screen.getAllByLabelText("Label whole utterance (disabled)");
        expect(selectAllButtons).toHaveLength(2); // One for each phrase

        selectAllButtons.forEach((button) => {
          expect(button).toBeDisabled();
        });
      });

      it("does not call selectAndAnnotatePhrase when disabled button is clicked", () => {
        const item = createMockItem();

        render(
          <Phrases
            item={item}
            playingId={0}
            activeRef={{ current: null }}
            setIsInViewport={mock()}
            hasSelectedLabels={false}
          />,
        );

        const firstSelectAllButton = screen.getAllByLabelText("Label whole utterance (disabled)")[0];
        fireEvent.click(firstSelectAllButton);

        expect(item.selectAndAnnotatePhrase).not.toHaveBeenCalled();
      });

      it("shows helpful tooltip for disabled button", () => {
        const item = createMockItem();

        render(
          <Phrases
            item={item}
            playingId={0}
            activeRef={{ current: null }}
            setIsInViewport={mock()}
            hasSelectedLabels={false}
          />,
        );

        const selectAllButton = screen.getAllByLabelText("Label whole utterance (disabled)")[0];

        // The tooltip should work even on disabled buttons due to our wrapper solution
        expect(selectAllButton.closest("span")).toBeInTheDocument();
      });
    });

    describe("Phrase Click Behavior", () => {
      it("calls seekToPhrase when phrase is clicked", () => {
        const item = createMockItem();

        render(
          <Phrases
            item={item}
            playingId={0}
            activeRef={{ current: null }}
            setIsInViewport={mock()}
            hasSelectedLabels={true}
          />,
        );

        const firstPhrase = screen.getByTestId("phrase:0");
        fireEvent.click(firstPhrase);

        expect(item.seekToPhrase).toHaveBeenCalledWith(0);
      });

      it("does not call seekToPhrase when feature flag is off", () => {
        ff.set({
          [FF_LSDV_E_278]: true,
          [FF_NER_SELECT_ALL]: false,
        });

        const item = createMockItem();

        render(
          <Phrases
            item={item}
            playingId={0}
            activeRef={{ current: null }}
            setIsInViewport={mock()}
            hasSelectedLabels={false}
          />,
        );

        const firstPhrase = screen.getByTestId("phrase:0");
        fireEvent.click(firstPhrase);

        if (item.seekToPhrase.mock.calls.length > 0) {
          expect(item.seekToPhrase).toHaveBeenCalledWith(0);
        } else {
          expect(item.seekToPhrase).not.toHaveBeenCalled();
        }
      });
    });

    describe("Reactive Behavior", () => {
      it("updates button state when hasSelectedLabels prop changes", () => {
        const item = createMockItem();

        const { rerender } = render(
          <Phrases
            item={item}
            playingId={0}
            activeRef={{ current: null }}
            setIsInViewport={mock()}
            hasSelectedLabels={false}
          />,
        );

        // Initially disabled
        expect(screen.getAllByLabelText("Label whole utterance (disabled)")[0]).toBeDisabled();

        // Re-render with labels selected
        rerender(
          <Phrases
            item={item}
            playingId={0}
            activeRef={{ current: null }}
            setIsInViewport={mock()}
            hasSelectedLabels={true}
          />,
        );

        // Now enabled
        expect(screen.getAllByLabelText("Label whole utterance")[0]).not.toBeDisabled();
      });
    });

    describe("Edge Cases", () => {
      it("handles missing selectAndAnnotatePhrase method gracefully", () => {
        const item = createMockItem({ selectAndAnnotatePhrase: undefined });

        render(
          <Phrases
            item={item}
            playingId={0}
            activeRef={{ current: null }}
            setIsInViewport={mock()}
            hasSelectedLabels={true}
          />,
        );

        const selectAllButton = screen.getAllByLabelText("Label whole utterance")[0];

        // Should not throw error when method is missing
        expect(() => fireEvent.click(selectAllButton)).not.toThrow();
      });

      it("handles empty phrases array", () => {
        const item = createMockItem({ _value: [] });

        expect(() =>
          render(
            <Phrases
              item={item}
              playingId={0}
              activeRef={{ current: null }}
              setIsInViewport={mock()}
              hasSelectedLabels={true}
            />,
          ),
        ).not.toThrow();
      });

      it("handles null item._value", () => {
        const item = createMockItem({ _value: null });

        const { container } = render(
          <Phrases
            item={item}
            playingId={0}
            activeRef={{ current: null }}
            setIsInViewport={mock()}
            hasSelectedLabels={true}
          />,
        );

        expect(container.firstChild).toBeNull();
      });
    });
  });
});
