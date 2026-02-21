/**
 * Unit tests for HtxParagraphs view (tags/object/Paragraphs/HtxParagraphs.jsx)
 */
import { FF_DEV_2669, FF_DEV_2918, FF_LSDV_E_278, FF_NER_SELECT_ALL } from "../../../../utils/feature-flags";
import { HtxParagraphsView } from "../HtxParagraphs";

jest.mock("../../../../utils/feature-flags", () => ({
  ...jest.requireActual("../../../../utils/feature-flags"),
  isFF: jest.fn(),
}));

function defaultIsFF(flag) {
  return flag === FF_LSDV_E_278;
}

beforeEach(() => {
  jest.clearAllMocks();
  const { isFF } = require("../../../../utils/feature-flags");
  isFF.mockImplementation(defaultIsFF);
});

function createMockItem(overrides = {}) {
  return {
    name: "paragraphs",
    _value: [
      { author: "A", text: "First phrase.", start: 0, end: 1 },
      { author: "B", text: "Second phrase.", start: 1, end: 2 },
    ],
    _update: 0,
    playingId: -1,
    playing: false,
    contextscroll: true,
    layoutClasses: { text: "text-class", name: "name-class", phrase: "phrase-class" },
    audio: null,
    seekToPhrase: jest.fn(),
    setViewRef: jest.fn(),
    isVisibleForAuthorFilter: jest.fn(() => true),
    activeStates: jest.fn(() => []),
    ...overrides,
  };
}

describe("HtxParagraphsView", () => {
  describe("removeSurroundingNewlines", () => {
    it("strips leading and trailing newlines", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      expect(view.removeSurroundingNewlines("\n\nhello\n\n")).toBe("hello");
    });

    it("returns string unchanged when no leading/trailing newlines", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      expect(view.removeSurroundingNewlines("hello")).toBe("hello");
    });

    it("strips only leading newlines", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      expect(view.removeSurroundingNewlines("\n\nhello")).toBe("hello");
    });

    it("strips only trailing newlines", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      expect(view.removeSurroundingNewlines("hello\n\n")).toBe("hello");
    });
  });

  describe("getSelectionText", () => {
    it("returns selection toString", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const sel = { toString: () => "selected text" };
      expect(view.getSelectionText(sel)).toBe("selected text");
    });
  });

  describe("_disposeTimeout", () => {
    it("clears scrollTimeout array", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      view.scrollTimeout = [setTimeout(() => {}, 10000), setTimeout(() => {}, 10000)];
      view._disposeTimeout();
      expect(view.scrollTimeout).toEqual([]);
    });

    it("is a no-op when scrollTimeout is already empty", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      view.scrollTimeout = [];
      view._disposeTimeout();
      expect(view.scrollTimeout).toEqual([]);
    });
  });

  describe("shouldScroll", () => {
    it("returns false when contextscroll is false", () => {
      const item = createMockItem({ contextscroll: false });
      const view = new HtxParagraphsView({ item });
      view.state = { canScroll: true, inViewPort: true };
      view.lastPlayingId = -1;
      expect(view.shouldScroll()).toBe(false);
    });

    it("returns false when playingId < 0", () => {
      const item = createMockItem({ playingId: -1 });
      const view = new HtxParagraphsView({ item });
      view.state = { canScroll: true, inViewPort: true };
      view.lastPlayingId = -1;
      expect(view.shouldScroll()).toBe(false);
    });

    it("returns false when canScroll is false", () => {
      const item = createMockItem({ playingId: 0 });
      const view = new HtxParagraphsView({ item });
      view.state = { canScroll: false, inViewPort: true };
      view.lastPlayingId = -1;
      expect(view.shouldScroll()).toBe(false);
    });

    it("returns true when all conditions are met", () => {
      const item = createMockItem({ playingId: 1, contextscroll: true });
      const view = new HtxParagraphsView({ item });
      view.state = { canScroll: true, inViewPort: true };
      view.lastPlayingId = 0;
      expect(view.shouldScroll()).toBe(true);
    });
  });

  describe("getContainerPadding", () => {
    it("returns padding-top from computed style", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const el = document.createElement("div");
      view.myRef = { current: el };
      const getPropertyValue = jest.fn(() => "16");
      window.getComputedStyle = jest.fn(() => ({ getPropertyValue }));
      expect(view.getContainerPadding()).toBe(16);
    });

    it("returns 0 when padding-top is not parseable", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      view.myRef = { current: document.createElement("div") };
      window.getComputedStyle = jest.fn(() => ({ getPropertyValue: () => "" }));
      expect(view.getContainerPadding()).toBe(0);
    });
  });

  describe("calculatePhraseScrollPosition", () => {
    it("returns 0 when phrase element not found", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const root = document.createElement("div");
      root.querySelector = jest.fn(() => null);
      view.myRef = { current: root };
      expect(view.calculatePhraseScrollPosition(0)).toBe(0);
    });

    it("returns phrase position relative to container", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const phraseEl = document.createElement("div");
      const root = document.createElement("div");
      root.querySelector = jest.fn(() => phraseEl);
      root.getBoundingClientRect = jest.fn(() => ({ top: 100 }));
      root.scrollTop = 50;
      phraseEl.getBoundingClientRect = jest.fn(() => ({ top: 200 }));
      view.myRef = { current: root };
      expect(view.calculatePhraseScrollPosition(0)).toBe(150);
    });
  });

  describe("handleNormalPhraseScroll", () => {
    it("returns early when not inViewPort", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      view.state = { inViewPort: false };
      view.performProgrammaticScroll = jest.fn();
      view.getContainerPadding = jest.fn(() => 0);
      view.handleNormalPhraseScroll();
      expect(view.performProgrammaticScroll).not.toHaveBeenCalled();
    });

    it("scrolls to padding when playingId <= 0", () => {
      const item = createMockItem({ playingId: 0 });
      const view = new HtxParagraphsView({ item });
      view.state = { inViewPort: true };
      view.performProgrammaticScroll = jest.fn();
      view.getContainerPadding = jest.fn(() => 10);
      view.handleNormalPhraseScroll();
      expect(view.performProgrammaticScroll).toHaveBeenCalledWith(10);
    });

    it("scrolls to phrase position when playingId > 0", () => {
      const item = createMockItem({ playingId: 1 });
      const view = new HtxParagraphsView({ item });
      view.state = { inViewPort: true };
      view.myRef = { current: { querySelector: jest.fn(() => ({})), getBoundingClientRect: () => ({}), scrollTop: 0 } };
      view.performProgrammaticScroll = jest.fn();
      view.calculatePhraseScrollPosition = jest.fn(() => 100);
      view.handleNormalPhraseScroll();
      expect(view.performProgrammaticScroll).toHaveBeenCalledWith(100);
    });
  });

  describe("getPhraseElement", () => {
    it("returns node when it has layoutClasses.text", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const node = document.createElement("div");
      node.classList.add("text-class");
      expect(view.getPhraseElement(node)).toBe(node);
    });

    it("returns parent with text class when node does not have it", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const parent = document.createElement("div");
      parent.classList.add("text-class");
      const child = document.createElement("span");
      parent.appendChild(child);
      expect(view.getPhraseElement(child)).toBe(parent);
    });
  });

  describe("getOffsetInPhraseElement", () => {
    it("returns [fullOffset, phraseNode, phraseIndex, phraseIndex] for middle-of-phrase selection", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const root = document.createElement("div");
      const p1 = document.createElement("div");
      p1.classList.add("text-class");
      p1.textContent = "Hello world";
      root.appendChild(p1);
      view.myRef = { current: root };
      const textNode = p1.firstChild || p1;
      const [offset, node, idx, origIdx] = view.getOffsetInPhraseElement(textNode, 5, true);
      expect(offset).toBe(5);
      expect(node).toBe(p1);
      expect(idx).toBe(0);
      expect(origIdx).toBe(0);
    });

    it("returns next phrase index when selection at end of phrase (isStart)", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const root = document.createElement("div");
      const p1 = document.createElement("div");
      p1.classList.add("text-class");
      p1.textContent = "Hi";
      root.appendChild(p1);
      const p2 = document.createElement("div");
      p2.classList.add("text-class");
      p2.textContent = "Bye";
      root.appendChild(p2);
      view.myRef = { current: root };
      const textNode = p1.firstChild;
      const [offset, node, idx, origIdx] = view.getOffsetInPhraseElement(textNode, 2, true);
      expect(offset).toBe(0);
      expect(node).toBe(p1);
      expect(idx).toBe(1);
      expect(origIdx).toBe(0);
    });

    it("returns previous phrase when selection at start (isStart false)", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const root = document.createElement("div");
      const p1 = document.createElement("div");
      p1.classList.add("text-class");
      p1.textContent = "Hi";
      root.appendChild(p1);
      const p2 = document.createElement("div");
      p2.classList.add("text-class");
      p2.textContent = "Bye";
      root.appendChild(p2);
      view.myRef = { current: root };
      const textNode = p2.firstChild;
      const [offset, node, idx, origIdx] = view.getOffsetInPhraseElement(textNode, 0, false);
      expect(offset).toBe(2);
      expect(node).toBe(p1);
      expect(idx).toBe(0);
      expect(origIdx).toBe(1);
    });
  });

  describe("setIsInViewPort", () => {
    it("updates state with given value", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      view.setState = jest.fn();
      view.setIsInViewPort(false);
      expect(view.setState).toHaveBeenCalledWith({ inViewPort: false });
    });
  });

  describe("onScroll", () => {
    it("sets inViewPort to false when not programmatic scroll", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      view.setState = jest.fn();
      view.state = { inViewPort: true };
      view.isProgrammaticScroll = false;
      view.onScroll();
      expect(view.setState).toHaveBeenCalledWith({ inViewPort: false });
    });

    it("does not update state when isProgrammaticScroll is true", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      view.setState = jest.fn();
      view.state = { inViewPort: true };
      view.isProgrammaticScroll = true;
      view.onScroll();
      expect(view.setState).not.toHaveBeenCalled();
    });
  });

  describe("performProgrammaticScroll", () => {
    it("calls scrollTo on myRef with max(0, top)", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const scrollTo = jest.fn();
      view.myRef = { current: { scrollTo } };
      jest.useFakeTimers();
      view.performProgrammaticScroll(100);
      expect(scrollTo).toHaveBeenCalledWith({ top: 100, behavior: "smooth" });
      view.performProgrammaticScroll(-10);
      expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "smooth" });
      jest.useRealTimers();
    });
  });

  describe("getRegionsForPhrase (FF_NER_SELECT_ALL)", () => {
    beforeEach(() => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_LSDV_E_278 || flag === FF_NER_SELECT_ALL);
    });

    it("returns [] when item has no annotation", () => {
      const item = createMockItem();
      delete item.annotation;
      const view = new HtxParagraphsView({ item });
      expect(view.getRegionsForPhrase(0)).toEqual([]);
    });

    it("returns regions that span the phrase index", () => {
      const region1 = { start: "0", end: "1" };
      const region2 = { start: "1", end: "2" };
      const item = createMockItem({
        annotation: { regionStore: { regions: [region1, region2] } },
      });
      const view = new HtxParagraphsView({ item });
      expect(view.getRegionsForPhrase(0)).toContain(region1);
      expect(view.getRegionsForPhrase(1)).toContain(region2);
    });

    it("uses item.annotation.regions when regionStore is absent", () => {
      const region1 = { start: "0", end: "1" };
      const item = createMockItem({ annotation: { regions: [region1] } });
      const view = new HtxParagraphsView({ item });
      expect(view.getRegionsForPhrase(0)).toContain(region1);
    });
  });

  describe("selectRegion (FF_NER_SELECT_ALL)", () => {
    beforeEach(() => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_LSDV_E_278 || flag === FF_NER_SELECT_ALL);
    });

    it("calls item.annotation.selectArea and returns true", () => {
      const selectArea = jest.fn();
      const item = createMockItem({ annotation: { selectArea } });
      const view = new HtxParagraphsView({ item });
      const region = {};
      expect(view.selectRegion(region)).toBe(true);
      expect(selectArea).toHaveBeenCalledWith(region);
    });
  });

  describe("hasSelectedLabels (FF_NER_SELECT_ALL)", () => {
    beforeEach(() => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_LSDV_E_278 || flag === FF_NER_SELECT_ALL);
    });

    it("returns false when activeStates returns empty", () => {
      const item = createMockItem({ activeStates: jest.fn(() => []) });
      const view = new HtxParagraphsView({ item });
      expect(view.hasSelectedLabels).toBe(false);
    });

    it("returns true when activeStates returns non-empty", () => {
      const item = createMockItem({ activeStates: jest.fn(() => [{}]) });
      const view = new HtxParagraphsView({ item });
      expect(view.hasSelectedLabels).toBe(true);
    });

    it("returns false when activeStates throws", () => {
      const item = createMockItem({
        activeStates: jest.fn(() => {
          throw new Error("");
        }),
      });
      const view = new HtxParagraphsView({ item });
      expect(view.hasSelectedLabels).toBe(false);
    });
  });

  describe("selectRegionsForPhrase (FF_NER_SELECT_ALL)", () => {
    beforeEach(() => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_LSDV_E_278 || flag === FF_NER_SELECT_ALL);
    });

    it("returns early when annotation has no results", () => {
      const item = createMockItem({ annotation: { results: null, regionStore: { regions: [] } } });
      const view = new HtxParagraphsView({ item });
      view.getRegionsForPhrase = jest.fn();
      view.selectRegion = jest.fn();
      view.selectRegionsForPhrase(0);
      expect(view.getRegionsForPhrase).not.toHaveBeenCalled();
    });

    it("calls unselectAreas and selectRegion when phrase has regions", () => {
      const r1 = {};
      const unselectAreas = jest.fn();
      const item = createMockItem({
        annotation: { unselectAreas, results: [{}], regionStore: { regions: [r1] } },
      });
      const view = new HtxParagraphsView({ item });
      view.getRegionsForPhrase = jest.fn(() => [r1]);
      view.selectRegion = jest.fn();
      view.selectRegionsForPhrase(0);
      expect(unselectAreas).toHaveBeenCalled();
      expect(view.selectRegion).toHaveBeenCalledWith(r1);
    });

    it("does not call selectRegion when phrase has no regions", () => {
      const unselectAreas = jest.fn();
      const item = createMockItem({
        annotation: { unselectAreas, results: [{}], regionStore: { regions: [] } },
      });
      const view = new HtxParagraphsView({ item });
      view.getRegionsForPhrase = jest.fn(() => []);
      view.selectRegion = jest.fn();
      view.selectRegionsForPhrase(0);
      expect(unselectAreas).toHaveBeenCalled();
      expect(view.selectRegion).not.toHaveBeenCalled();
    });
  });

  describe("handleNextPhrase", () => {
    beforeEach(() => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_LSDV_E_278 || flag === FF_NER_SELECT_ALL);
    });

    it("calls item.goToNextPhrase and selectRegionsForPhrase", () => {
      const goToNextPhrase = jest.fn();
      const item = createMockItem({
        goToNextPhrase,
        playingId: 0,
        annotation: { regionStore: { regions: [] } },
      });
      const view = new HtxParagraphsView({ item });
      view.selectRegion = jest.fn();
      view.getRegionsForPhrase = jest.fn(() => []);
      view.handleNextPhrase();
      expect(goToNextPhrase).toHaveBeenCalled();
    });
  });

  describe("handlePreviousPhrase", () => {
    beforeEach(() => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_LSDV_E_278 || flag === FF_NER_SELECT_ALL);
    });

    it("calls item.goToPreviousPhrase", () => {
      const goToPreviousPhrase = jest.fn();
      const item = createMockItem({
        goToPreviousPhrase,
        playingId: 1,
        annotation: { regionStore: { regions: [] } },
      });
      const view = new HtxParagraphsView({ item });
      view.selectRegion = jest.fn();
      view.getRegionsForPhrase = jest.fn(() => []);
      view.handlePreviousPhrase();
      expect(goToPreviousPhrase).toHaveBeenCalled();
    });
  });

  describe("handleSelectAllAndAnnotate", () => {
    beforeEach(() => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_NER_SELECT_ALL);
    });

    it("calls item.selectAllAndAnnotateCurrentPhrase", () => {
      const selectAllAndAnnotateCurrentPhrase = jest.fn();
      const item = createMockItem({ selectAllAndAnnotateCurrentPhrase });
      const view = new HtxParagraphsView({ item });
      view.handleSelectAllAndAnnotate();
      expect(selectAllAndAnnotateCurrentPhrase).toHaveBeenCalled();
    });
  });

  describe("handleNextRegion (FF_NER_SELECT_ALL)", () => {
    beforeEach(() => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_LSDV_E_278 || flag === FF_NER_SELECT_ALL);
    });

    it("returns early when playingId < 0", () => {
      const item = createMockItem({ playingId: -1, annotation: { selectedRegions: [], unselectAll: jest.fn() } });
      const view = new HtxParagraphsView({ item });
      view.getRegionsForPhrase = jest.fn(() => []);
      view.selectRegion = jest.fn();
      view.handleNextRegion();
      expect(view.selectRegion).not.toHaveBeenCalled();
    });

    it("returns early when phraseRegions is empty", () => {
      const item = createMockItem({ playingId: 0, annotation: { selectedRegions: [], unselectAll: jest.fn() } });
      const view = new HtxParagraphsView({ item });
      view.getRegionsForPhrase = jest.fn(() => []);
      view.selectRegion = jest.fn();
      view.handleNextRegion();
      expect(view.selectRegion).not.toHaveBeenCalled();
    });

    it("selects next region in phrase", () => {
      const r1 = {};
      const r2 = {};
      const unselectAll = jest.fn();
      const item = createMockItem({
        playingId: 0,
        annotation: { selectedRegions: [r1], unselectAll },
      });
      const view = new HtxParagraphsView({ item });
      view.getRegionsForPhrase = jest.fn(() => [r1, r2]);
      view.selectRegion = jest.fn();
      view.handleNextRegion();
      expect(unselectAll).toHaveBeenCalled();
      expect(view.selectRegion).toHaveBeenCalledWith(r2);
    });

    it("selects first region when no region is selected (currentIndex -1)", () => {
      const r1 = {};
      const r2 = {};
      const unselectAll = jest.fn();
      const item = createMockItem({
        playingId: 0,
        annotation: { selectedRegions: [], unselectAll },
      });
      const view = new HtxParagraphsView({ item });
      view.getRegionsForPhrase = jest.fn(() => [r1, r2]);
      view.selectRegion = jest.fn();
      view.handleNextRegion();
      expect(view.selectRegion).toHaveBeenCalledWith(r1);
    });
  });

  describe("handlePreviousRegion (FF_NER_SELECT_ALL)", () => {
    beforeEach(() => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_LSDV_E_278 || flag === FF_NER_SELECT_ALL);
    });

    it("selects previous region in phrase", () => {
      const r1 = {};
      const r2 = {};
      const unselectAll = jest.fn();
      const item = createMockItem({
        playingId: 0,
        annotation: { selectedRegions: [r2], unselectAll },
      });
      const view = new HtxParagraphsView({ item });
      view.getRegionsForPhrase = jest.fn(() => [r1, r2]);
      view.selectRegion = jest.fn();
      view.handlePreviousRegion();
      expect(unselectAll).toHaveBeenCalled();
      expect(view.selectRegion).toHaveBeenCalledWith(r1);
    });

    it("selects last region when no region is selected (currentIndex -1)", () => {
      const r1 = {};
      const r2 = {};
      const unselectAll = jest.fn();
      const item = createMockItem({
        playingId: 0,
        annotation: { selectedRegions: [], unselectAll },
      });
      const view = new HtxParagraphsView({ item });
      view.getRegionsForPhrase = jest.fn(() => [r1, r2]);
      view.selectRegion = jest.fn();
      view.handlePreviousRegion();
      expect(view.selectRegion).toHaveBeenCalledWith(r2);
    });
  });

  describe("handleTallPhraseScroll", () => {
    it("schedules scroll timeouts when phrase is taller than container", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      view.myRef = { current: { offsetHeight: 100 } };
      view.activeRef = { current: { offsetTop: 0, offsetHeight: 300 } };
      view.getContainerPadding = jest.fn(() => 0);
      view.state = { inViewPort: true, canScroll: true };
      view.performProgrammaticScroll = jest.fn();
      view.scrollTimeout = [];
      view.handleTallPhraseScroll(300, 2);
      expect(view.scrollTimeout.length).toBeGreaterThan(0);
    });

    it("does not call performProgrammaticScroll when inViewPort is false", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      view.myRef = { current: { offsetHeight: 100 } };
      view.activeRef = { current: { offsetTop: 0, offsetHeight: 300 } };
      view.getContainerPadding = jest.fn(() => 0);
      view.state = { inViewPort: false, canScroll: true };
      view.performProgrammaticScroll = jest.fn();
      view.scrollTimeout = [];
      jest.useFakeTimers();
      view.handleTallPhraseScroll(300, 2);
      jest.advanceTimersByTime(2000);
      expect(view.performProgrammaticScroll).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it("does not call performProgrammaticScroll when canScroll is false", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      view.myRef = { current: { offsetHeight: 100 } };
      view.activeRef = { current: { offsetTop: 0, offsetHeight: 300 } };
      view.getContainerPadding = jest.fn(() => 0);
      view.state = { inViewPort: true, canScroll: false };
      view.performProgrammaticScroll = jest.fn();
      view.scrollTimeout = [];
      jest.useFakeTimers();
      view.handleTallPhraseScroll(300, 2);
      jest.advanceTimersByTime(2000);
      expect(view.performProgrammaticScroll).not.toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  describe("_determineRegion", () => {
    it("returns region that contains the element", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const span = document.createElement("span");
      span.className = "htx-highlight";
      const region = { find: jest.fn(() => true) };
      item.regs = [region];
      expect(view._determineRegion(span)).toBe(region);
    });

    it("uses element.closest when element is not a SPAN", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const span = document.createElement("span");
      span.className = "htx-highlight";
      const parent = document.createElement("div");
      parent.className = "htx-highlight";
      parent.appendChild(span);
      parent.closest = jest.fn(() => span);
      const region = { find: jest.fn(() => true) };
      item.regs = [region];
      expect(view._determineRegion(parent)).toBe(region);
      expect(parent.closest).toHaveBeenCalledWith(".htx-highlight");
    });

    it("returns undefined when no region finds the span", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const span = document.createElement("span");
      span.className = "htx-highlight";
      item.regs = [{ find: jest.fn(() => false) }];
      expect(view._determineRegion(span)).toBeUndefined();
    });
  });

  describe("phraseElements getter", () => {
    it("returns array of elements with layoutClasses.text", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const el1 = document.createElement("div");
      el1.className = "text-class";
      const el2 = document.createElement("div");
      el2.className = "text-class";
      const collection = [el1, el2];
      view.myRef = { current: { getElementsByClassName: jest.fn(() => collection) } };
      expect(view.phraseElements).toEqual([el1, el2]);
      expect(view.myRef.current.getElementsByClassName).toHaveBeenCalledWith("text-class");
    });
  });

  describe("selectText", () => {
    it("returns early when phrases is null or phraseIndex out of range", () => {
      const item = createMockItem({ _value: null });
      const view = new HtxParagraphsView({ item });
      view.myRef = { current: { getElementsByClassName: () => [] } };
      const removeAllRanges = jest.fn();
      const addRange = jest.fn();
      window.getSelection = jest.fn(() => ({ removeAllRanges, addRange }));
      view.selectText(0);
      expect(addRange).not.toHaveBeenCalled();
    });

    it("returns early when phraseElements is null", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      view.myRef = { current: null };
      view.selectText(0);
      expect(window.getSelection).not.toHaveBeenCalled();
    });

    it("selects phrase element contents when valid index", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const phraseEl = document.createElement("div");
      phraseEl.textContent = "Hello";
      const getElementsByClassName = jest.fn(() => [phraseEl]);
      view.myRef = { current: { getElementsByClassName } };
      const removeAllRanges = jest.fn();
      const addRange = jest.fn();
      window.getSelection = jest.fn(() => ({ removeAllRanges, addRange }));
      const mockRange = { selectNodeContents: jest.fn() };
      const createRangeSpy = jest.spyOn(document, "createRange").mockReturnValue(mockRange);
      view.selectText(0);
      expect(getElementsByClassName).toHaveBeenCalledWith("text-class");
      expect(mockRange.selectNodeContents).toHaveBeenCalledWith(phraseEl);
      expect(removeAllRanges).toHaveBeenCalled();
      expect(addRange).toHaveBeenCalledWith(mockRange);
      createRangeSpy.mockRestore();
    });

    it("returns early when phraseElement at index is missing", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      view.myRef = { current: { getElementsByClassName: () => [] } };
      const addRange = jest.fn();
      window.getSelection = jest.fn(() => ({ removeAllRanges: jest.fn(), addRange }));
      view.selectText(0);
      expect(addRange).not.toHaveBeenCalled();
    });
  });

  describe("_selectRegions", () => {
    it("calls extendSelectionWith when additionalMode is true", () => {
      const extendSelectionWith = jest.fn();
      const item = createMockItem({
        annotation: { extendSelectionWith, selectAreas: jest.fn() },
        regs: [],
      });
      const view = new HtxParagraphsView({ item });
      const span = document.createElement("span");
      span.className = "htx-highlight";
      const root = document.createElement("div");
      root.appendChild(span);
      view.myRef = { current: root };
      const removeAllRanges = jest.fn();
      window.getSelection = jest.fn(() => ({ removeAllRanges }));
      jest.spyOn(require("../../../../utils/selection-tools"), "isSelectionContainsSpan").mockReturnValue(true);
      const region = {};
      view._determineRegion = jest.fn(() => region);
      view._selectRegions(true);
      expect(extendSelectionWith).toHaveBeenCalledWith([region]);
      expect(removeAllRanges).toHaveBeenCalled();
    });

    it("calls selectAreas when additionalMode is false", () => {
      const selectAreas = jest.fn();
      const item = createMockItem({
        annotation: { selectAreas, extendSelectionWith: jest.fn() },
        regs: [],
      });
      const view = new HtxParagraphsView({ item });
      const span = document.createElement("span");
      span.className = "htx-highlight";
      const root = document.createElement("div");
      root.appendChild(span);
      view.myRef = { current: root };
      jest.spyOn(require("../../../../utils/selection-tools"), "isSelectionContainsSpan").mockReturnValue(true);
      const region = {};
      view._determineRegion = jest.fn(() => region);
      view._selectRegions(false);
      expect(selectAreas).toHaveBeenCalledWith([region]);
    });

    it("does not call selectAreas or removeAllRanges when no regions found", () => {
      const selectAreas = jest.fn();
      const removeAllRanges = jest.fn();
      const item = createMockItem({
        annotation: { selectAreas, extendSelectionWith: jest.fn() },
        regs: [],
      });
      const view = new HtxParagraphsView({ item });
      const root = document.createElement("div");
      root.appendChild(document.createElement("div"));
      view.myRef = { current: root };
      window.getSelection = jest.fn(() => ({ removeAllRanges }));
      jest.spyOn(require("../../../../utils/selection-tools"), "isSelectionContainsSpan").mockReturnValue(false);
      view._selectRegions(false);
      expect(selectAreas).not.toHaveBeenCalled();
      expect(removeAllRanges).not.toHaveBeenCalled();
    });
  });

  describe("isDuplicateRegion (FF_NER_SELECT_ALL)", () => {
    beforeEach(() => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_LSDV_E_278 || flag === FF_NER_SELECT_ALL);
    });

    it("returns false when FF_NER_SELECT_ALL is off", () => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation(() => false);
      const item = createMockItem({ regs: [{ start: "0", end: "1", startOffset: 0, endOffset: 5 }] });
      const view = new HtxParagraphsView({ item });
      expect(view.isDuplicateRegion({ start: "0", end: "1", startOffset: 0, endOffset: 5 }, ["Label"], null)).toBe(
        false,
      );
    });

    it("returns true when same boundaries, offsets and labels exist", () => {
      const item = createMockItem({
        regs: [
          {
            start: "0",
            end: "1",
            startOffset: 0,
            endOffset: 5,
            results: [{ from_name: { isLabeling: true }, mainValue: ["Label"] }],
          },
        ],
      });
      const view = new HtxParagraphsView({ item });
      expect(view.isDuplicateRegion({ start: "0", end: "1", startOffset: 0, endOffset: 5 }, ["Label"], null)).toBe(
        true,
      );
    });

    it("returns false when boundaries differ", () => {
      const item = createMockItem({
        regs: [{ start: "0", end: "1", startOffset: 0, endOffset: 5 }],
      });
      const view = new HtxParagraphsView({ item });
      expect(view.isDuplicateRegion({ start: "1", end: "2", startOffset: 0, endOffset: 5 }, ["Label"], null)).toBe(
        false,
      );
    });

    it("returns false when labels differ", () => {
      const item = createMockItem({
        regs: [
          {
            start: "0",
            end: "1",
            startOffset: 0,
            endOffset: 5,
            results: [{ from_name: { isLabeling: true }, mainValue: ["Other"] }],
          },
        ],
      });
      const view = new HtxParagraphsView({ item });
      expect(view.isDuplicateRegion({ start: "0", end: "1", startOffset: 0, endOffset: 5 }, ["Label"], null)).toBe(
        false,
      );
    });

    it("returns false when region has no labeling result (regionLabels empty)", () => {
      const item = createMockItem({
        regs: [
          {
            start: "0",
            end: "1",
            startOffset: 0,
            endOffset: 5,
            results: [{ from_name: { isLabeling: false } }],
          },
        ],
      });
      const view = new HtxParagraphsView({ item });
      expect(view.isDuplicateRegion({ start: "0", end: "1", startOffset: 0, endOffset: 5 }, ["Label"], null)).toBe(
        false,
      );
    });
  });

  describe("createAnnotationFromRanges", () => {
    it("sets _currentSpan to null and skips duplicate check when selectedRanges is empty", () => {
      const item = createMockItem({
        activeStates: jest.fn(() => [{}]),
        addRegion: jest.fn(),
      });
      item._currentSpan = "something";
      const view = new HtxParagraphsView({ item });
      view.createAnnotationFromRanges([]);
      expect(item._currentSpan).toBe(null);
    });

    it("returns early when duplicate detected (FF_NER_SELECT_ALL)", () => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_NER_SELECT_ALL || flag === FF_LSDV_E_278);
      const addRegion = jest.fn();
      const item = createMockItem({
        activeStates: jest.fn(() => [{ selectedValues: () => ["Label"] }]),
        addRegion,
        regs: [
          {
            start: "0",
            end: "1",
            startOffset: 0,
            endOffset: 5,
            results: [{ from_name: { isLabeling: true }, mainValue: ["Label"] }],
          },
        ],
      });
      const view = new HtxParagraphsView({ item });
      view.createAnnotationFromRanges([{ start: "0", end: "1", startOffset: 0, endOffset: 5 }]);
      expect(addRegion).not.toHaveBeenCalled();
    });

    it("calls console.warn when no label selected", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const item = createMockItem({
        activeStates: jest.fn(() => []),
        addRegion: jest.fn(),
      });
      const view = new HtxParagraphsView({ item });
      view.createAnnotationFromRanges([{ start: "0", end: "1", startOffset: 0, endOffset: 5 }]);
      expect(warn).toHaveBeenCalledWith("No label selected. Annotation will not be created.");
      warn.mockRestore();
    });

    it("calls item.addRegion when FF_DEV_2918 is off", () => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_LSDV_E_278);
      const createdRegion = {
        createSpans: jest.fn(() => []),
        addEventsToSpans: jest.fn(),
      };
      const addRegion = jest.fn(() => createdRegion);
      const item = createMockItem({
        activeStates: jest.fn(() => [{ selectedValues: () => [] }]),
        addRegion,
      });
      const view = new HtxParagraphsView({ item });
      view.createAnnotationFromRanges([{ start: "0", end: "1", startOffset: 0, endOffset: 5 }]);
      expect(addRegion).toHaveBeenCalledWith({ start: "0", end: "1", startOffset: 0, endOffset: 5 });
      expect(createdRegion.createSpans).toHaveBeenCalled();
      expect(createdRegion.addEventsToSpans).toHaveBeenCalledWith([]);
    });

    it("calls item.addRegions when FF_DEV_2918 is on", () => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_DEV_2918 || flag === FF_LSDV_E_278);
      const htxRange = {
        createSpans: jest.fn(() => []),
        addEventsToSpans: jest.fn(),
      };
      const addRegions = jest.fn(() => [htxRange]);
      const item = createMockItem({
        activeStates: jest.fn(() => [{ selectedValues: () => [] }]),
        addRegions,
      });
      const view = new HtxParagraphsView({ item });
      view.createAnnotationFromRanges([{ start: "0", end: "1", startOffset: 0, endOffset: 5 }]);
      expect(addRegions).toHaveBeenCalledWith([{ start: "0", end: "1", startOffset: 0, endOffset: 5 }]);
      expect(htxRange.createSpans).toHaveBeenCalled();
      expect(htxRange.addEventsToSpans).toHaveBeenCalledWith([]);
    });

    it("does not iterate htxRanges when addRegions returns empty array", () => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_DEV_2918 || flag === FF_LSDV_E_278);
      const addRegions = jest.fn(() => []);
      const item = createMockItem({
        activeStates: jest.fn(() => [{ selectedValues: () => [] }]),
        addRegions,
      });
      const view = new HtxParagraphsView({ item });
      view.createAnnotationFromRanges([{ start: "0", end: "1", startOffset: 0, endOffset: 5 }]);
      expect(addRegions).toHaveBeenCalled();
    });

    it("iterates all htxRanges when addRegions returns multiple", () => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_DEV_2918 || flag === FF_LSDV_E_278);
      const htxRange1 = { createSpans: jest.fn(() => []), addEventsToSpans: jest.fn() };
      const htxRange2 = { createSpans: jest.fn(() => []), addEventsToSpans: jest.fn() };
      const addRegions = jest.fn(() => [htxRange1, htxRange2]);
      const item = createMockItem({
        activeStates: jest.fn(() => [{ selectedValues: () => [] }]),
        addRegions,
      });
      const view = new HtxParagraphsView({ item });
      view.createAnnotationFromRanges([
        { start: "0", end: "0", startOffset: 0, endOffset: 2 },
        { start: "1", end: "1", startOffset: 0, endOffset: 2 },
      ]);
      expect(htxRange1.createSpans).toHaveBeenCalled();
      expect(htxRange2.createSpans).toHaveBeenCalled();
      expect(htxRange1.addEventsToSpans).toHaveBeenCalledWith([]);
      expect(htxRange2.addEventsToSpans).toHaveBeenCalledWith([]);
    });

    it("does not call createSpans when addRegion returns null", () => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_LSDV_E_278);
      const addRegion = jest.fn(() => null);
      const item = createMockItem({
        activeStates: jest.fn(() => [{ selectedValues: () => [] }]),
        addRegion,
      });
      const view = new HtxParagraphsView({ item });
      view.createAnnotationFromRanges([{ start: "0", end: "1", startOffset: 0, endOffset: 5 }]);
      expect(addRegion).toHaveBeenCalled();
    });
  });

  describe("_getResultText", () => {
    it("returns slice when start === end", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const p0 = document.createElement("div");
      p0.innerText = "Hello world";
      view.myRef = { current: { getElementsByClassName: () => [p0] } };
      expect(view._getResultText(0, 0, 2, 7)).toBe("llo w");
    });

    it("returns concatenated text across phrases when start !== end", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const p0 = document.createElement("div");
      p0.innerText = "One";
      const p1 = document.createElement("div");
      p1.innerText = "Two";
      const p2 = document.createElement("div");
      p2.innerText = "Three";
      view.myRef = { current: { getElementsByClassName: () => [p0, p1, p2] } };
      expect(view._getResultText(0, 2, 1, 2)).toBe("ne" + "Two" + "Th");
    });
  });

  describe("captureDocumentSelectionFromRange", () => {
    it("delegates to captureDocumentSelection after setting selection", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      view.captureDocumentSelection = jest.fn(() => []);
      const range = document.createRange();
      const sel = { removeAllRanges: jest.fn(), addRange: jest.fn() };
      window.getSelection = jest.fn(() => sel);
      view.captureDocumentSelectionFromRange(range);
      expect(sel.removeAllRanges).toHaveBeenCalled();
      expect(sel.addRange).toHaveBeenCalledWith(range);
      expect(view.captureDocumentSelection).toHaveBeenCalled();
    });
  });

  describe("captureDocumentSelection", () => {
    it("returns [] and restores visibility when selection is collapsed", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const nameEl = document.createElement("div");
      nameEl.className = "name-class";
      view.myRef = { current: { getElementsByClassName: (cls) => (cls === "name-class" ? [nameEl] : []) } };
      const removeAllRanges = jest.fn();
      const addRange = jest.fn();
      const getSelection = window.getSelection;
      window.getSelection = jest.fn(() => ({
        isCollapsed: true,
        rangeCount: 0,
        removeAllRanges,
        addRange,
      }));
      const result = view.captureDocumentSelection();
      expect(result).toEqual([]);
      expect(nameEl.style.visibility).toBe("unset");
      window.getSelection = getSelection;
    });

    it("catches errors in range processing and restores visibility", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const nameEl = document.createElement("div");
      nameEl.className = "name-class";
      const textEl = document.createElement("div");
      textEl.className = "text-class";
      textEl.textContent = "x";
      view.myRef = {
        current: {
          getElementsByClassName: (cls) => (cls === "name-class" ? [nameEl] : cls === "text-class" ? [textEl] : []),
        },
      };
      const range = document.createRange();
      range.setStart(textEl.firstChild, 0);
      range.setEnd(textEl.firstChild, 1);
      const removeAllRanges = jest.fn();
      const addRange = jest.fn();
      const getSelection = window.getSelection;
      window.getSelection = jest.fn(() => ({
        isCollapsed: false,
        rangeCount: 1,
        getRangeAt: () => range,
        removeAllRanges,
        addRange,
        toString: () => "x",
      }));
      jest.spyOn(require("../../../../utils/html"), "splitBoundaries").mockImplementation(() => {
        throw new Error("splitBoundaries error");
      });
      const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      const result = view.captureDocumentSelection();
      expect(result).toEqual([]);
      expect(nameEl.style.visibility).toBe("unset");
      expect(errSpy).toHaveBeenCalledWith("Can not get selection", expect.any(Error));
      errSpy.mockRestore();
      window.getSelection = getSelection;
    });

    it("returns one range when selection spans one phrase", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const nameEl = document.createElement("div");
      nameEl.className = "name-class";
      const textEl = document.createElement("div");
      textEl.className = "text-class";
      textEl.textContent = "hello";
      view.myRef = {
        current: {
          getElementsByClassName: (cls) => (cls === "name-class" ? [nameEl] : cls === "text-class" ? [textEl] : []),
        },
      };
      const range = document.createRange();
      range.setStart(textEl.firstChild, 0);
      range.setEnd(textEl.firstChild, 5);
      const removeAllRanges = jest.fn();
      const addRange = jest.fn();
      const getSelection = window.getSelection;
      window.getSelection = jest.fn(() => ({
        isCollapsed: false,
        rangeCount: 1,
        getRangeAt: () => range,
        removeAllRanges,
        addRange,
        toString: () => "hello",
      }));
      jest.spyOn(require("../../../../utils/html"), "splitBoundaries").mockImplementation(() => {});
      view.getOffsetInPhraseElement = jest
        .fn()
        .mockReturnValueOnce([0, textEl, 0, 0])
        .mockReturnValueOnce([5, textEl, 0, 0]);
      const result = view.captureDocumentSelection();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ start: "0", end: "0", startOffset: 0, endOffset: 5, text: "hello" });
      window.getSelection = getSelection;
    });

    it("skips range when endContainer has no text node descendant (continue branch)", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const nameEl = document.createElement("div");
      nameEl.className = "name-class";
      const textEl = document.createElement("div");
      textEl.className = "text-class";
      textEl.textContent = "hello";
      const emptyEl = document.createElement("div");
      emptyEl.className = "text-class";
      view.myRef = {
        current: {
          getElementsByClassName: (cls) =>
            cls === "name-class" ? [nameEl] : cls === "text-class" ? [textEl, emptyEl] : [],
        },
      };
      const range = document.createRange();
      range.setStart(textEl.firstChild, 0);
      range.setEnd(emptyEl, 0);
      const removeAllRanges = jest.fn();
      const addRange = jest.fn();
      const getSelection = window.getSelection;
      window.getSelection = jest.fn(() => ({
        isCollapsed: false,
        rangeCount: 1,
        getRangeAt: () => range,
        removeAllRanges,
        addRange,
        toString: () => "",
      }));
      jest.spyOn(require("../../../../utils/html"), "splitBoundaries").mockImplementation(() => {});
      view.getOffsetInPhraseElement = jest.fn().mockReturnValue([0, textEl, 0, 0]);
      const result = view.captureDocumentSelection();
      expect(result).toEqual([]);
      expect(nameEl.style.visibility).toBe("unset");
      window.getSelection = getSelection;
    });
  });

  describe("createAnnotationForPhrase", () => {
    it("returns early when phraseIndex < 0 or >= phrases.length", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      view.createAnnotationFromRanges = jest.fn();
      view.createAnnotationForPhrase(-1);
      view.createAnnotationForPhrase(10);
      expect(view.createAnnotationFromRanges).not.toHaveBeenCalled();
    });

    it("returns early when phraseElements is null", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      view.myRef = { current: null };
      view.captureDocumentSelectionFromRange = jest.fn();
      view.createAnnotationForPhrase(0);
      expect(view.captureDocumentSelectionFromRange).not.toHaveBeenCalled();
    });

    it("returns early when phraseElement at index is missing", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      view.myRef = { current: { getElementsByClassName: () => [] } };
      view.captureDocumentSelectionFromRange = jest.fn();
      view.createAnnotationForPhrase(0);
      expect(view.captureDocumentSelectionFromRange).not.toHaveBeenCalled();
    });

    it("calls createAnnotationFromRanges when phrase has text and selection captured", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const phraseEl = document.createElement("div");
      phraseEl.textContent = "Hello";
      view.myRef = { current: { getElementsByClassName: () => [phraseEl] } };
      view.captureDocumentSelectionFromRange = jest.fn(() => [
        { start: "0", end: "0", startOffset: 0, endOffset: 5, text: "Hello" },
      ]);
      view.createAnnotationFromRanges = jest.fn();
      view.createAnnotationForPhrase(0);
      expect(view.captureDocumentSelectionFromRange).toHaveBeenCalled();
      expect(view.createAnnotationFromRanges).toHaveBeenCalledWith([
        { start: "0", end: "0", startOffset: 0, endOffset: 5, text: "Hello" },
      ]);
    });

    it("returns early when phrase element has no text nodes", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const phraseEl = document.createElement("div");
      phraseEl.appendChild(document.createElement("span"));
      view.myRef = { current: { getElementsByClassName: () => [phraseEl] } };
      view.captureDocumentSelectionFromRange = jest.fn();
      view.createAnnotationForPhrase(0);
      expect(view.captureDocumentSelectionFromRange).not.toHaveBeenCalled();
    });
  });

  describe("selectRegion when FF off", () => {
    it("returns false when FF_NER_SELECT_ALL is off", () => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation(() => false);
      const item = createMockItem({ annotation: { selectArea: jest.fn() } });
      const view = new HtxParagraphsView({ item });
      expect(view.selectRegion({})).toBe(false);
    });
  });

  describe("getRegionsForPhrase when FF off", () => {
    it("returns [] when FF_NER_SELECT_ALL is off", () => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation(() => false);
      const item = createMockItem({ annotation: { regionStore: { regions: [{}] } } });
      const view = new HtxParagraphsView({ item });
      expect(view.getRegionsForPhrase(0)).toEqual([]);
    });
  });

  describe("getPhraseElement", () => {
    it("returns null when no ancestor has layoutClasses.text", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const node = document.createElement("span");
      expect(view.getPhraseElement(node)).toBe(null);
    });
  });

  describe("onMouseUp", () => {
    it("calls _selectRegions when ctrlKey or metaKey", () => {
      const item = createMockItem({ activeStates: jest.fn(() => []) });
      const view = new HtxParagraphsView({ item });
      view._selectRegions = jest.fn();
      view.onMouseUp({ ctrlKey: true, metaKey: false });
      expect(view._selectRegions).toHaveBeenCalledWith(true);
      view.onMouseUp({ ctrlKey: false, metaKey: true });
      expect(view._selectRegions).toHaveBeenLastCalledWith(true);
    });

    it("calls _selectRegions when no states", () => {
      const item = createMockItem({ activeStates: jest.fn(() => []) });
      const view = new HtxParagraphsView({ item });
      view._selectRegions = jest.fn();
      view.onMouseUp({ ctrlKey: false, metaKey: false });
      expect(view._selectRegions).toHaveBeenCalledWith(false);
    });

    it("returns early when annotation is read-only", () => {
      const item = createMockItem({
        activeStates: jest.fn(() => [{}]),
        annotation: { isReadOnly: jest.fn(() => true) },
      });
      const view = new HtxParagraphsView({ item });
      view.captureDocumentSelection = jest.fn();
      view.onMouseUp({ ctrlKey: false, metaKey: false });
      expect(view.captureDocumentSelection).not.toHaveBeenCalled();
    });

    it("returns early when captureDocumentSelection returns empty", () => {
      const item = createMockItem({
        activeStates: jest.fn(() => [{}]),
        annotation: { isReadOnly: jest.fn(() => false) },
      });
      const view = new HtxParagraphsView({ item });
      view.captureDocumentSelection = jest.fn(() => []);
      view.onMouseUp({ ctrlKey: false, metaKey: false });
      expect(view.captureDocumentSelection).toHaveBeenCalled();
    });

    it("calls item.addRegions when FF_DEV_2918 and selection captured", () => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_DEV_2918 || flag === FF_LSDV_E_278);
      const ranges = [{ start: "0", end: "0", startOffset: 0, endOffset: 5 }];
      const htxRange = { createSpans: jest.fn(() => []), addEventsToSpans: jest.fn() };
      const addRegions = jest.fn(() => [htxRange]);
      const item = createMockItem({
        activeStates: jest.fn(() => [{}]),
        annotation: { isReadOnly: jest.fn(() => false) },
        addRegions,
      });
      const view = new HtxParagraphsView({ item });
      view.captureDocumentSelection = jest.fn(() => ranges);
      view.onMouseUp({ ctrlKey: false, metaKey: false });
      expect(addRegions).toHaveBeenCalledWith(ranges);
      expect(htxRange.createSpans).toHaveBeenCalled();
      expect(htxRange.addEventsToSpans).toHaveBeenCalledWith([]);
    });

    it("calls item.addRegion when FF_DEV_2918 off and selection captured", () => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_LSDV_E_278);
      const ranges = [{ start: "0", end: "0", startOffset: 0, endOffset: 5 }];
      const createdRegion = { createSpans: jest.fn(() => []), addEventsToSpans: jest.fn() };
      const addRegion = jest.fn(() => createdRegion);
      const item = createMockItem({
        activeStates: jest.fn(() => [{}]),
        annotation: { isReadOnly: jest.fn(() => false) },
        addRegion,
      });
      const view = new HtxParagraphsView({ item });
      view.captureDocumentSelection = jest.fn(() => ranges);
      view.onMouseUp({ ctrlKey: false, metaKey: false });
      expect(addRegion).toHaveBeenCalledWith(ranges[0]);
      expect(createdRegion.createSpans).toHaveBeenCalled();
    });

    it("handles addRegions returning empty array", () => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_DEV_2918 || flag === FF_LSDV_E_278);
      const ranges = [{ start: "0", end: "0", startOffset: 0, endOffset: 5 }];
      const addRegions = jest.fn(() => []);
      const item = createMockItem({
        activeStates: jest.fn(() => [{}]),
        annotation: { isReadOnly: jest.fn(() => false) },
        addRegions,
      });
      const view = new HtxParagraphsView({ item });
      view.captureDocumentSelection = jest.fn(() => ranges);
      view.onMouseUp({ ctrlKey: false, metaKey: false });
      expect(addRegions).toHaveBeenCalledWith(ranges);
    });
  });

  describe("renderWrapperHeader", () => {
    it("returns a wrapper div with className from styles.wrapper_header", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const header = view.renderWrapperHeader();
      expect(header).toBeTruthy();
      expect(header.type).toBe("div");
    });
  });

  describe("render", () => {
    it("returns null when FF_DEV_2669 and !item._value", () => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_DEV_2669 || flag === FF_LSDV_E_278);
      const item = createMockItem({ _value: null });
      const view = new HtxParagraphsView({ item });
      expect(view.render()).toBe(null);
    });

    it("calls _disposeTimeout when !playing and FF_LSDV_E_278", () => {
      const item = createMockItem({ playing: false });
      const view = new HtxParagraphsView({ item });
      view._disposeTimeout = jest.fn();
      view.render();
      expect(view._disposeTimeout).toHaveBeenCalled();
    });

    it("does not call _disposeTimeout when FF_LSDV_E_278 is off", () => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation(() => false);
      const item = createMockItem({ playing: false, _value: [{}] });
      const view = new HtxParagraphsView({ item });
      view._disposeTimeout = jest.fn();
      view.render();
      expect(view._disposeTimeout).not.toHaveBeenCalled();
    });

    it("renders without wrapper header Toggle when contextscroll is false", () => {
      const item = createMockItem({ contextscroll: false });
      const view = new HtxParagraphsView({ item });
      const result = view.render();
      expect(result).toBeTruthy();
      expect(Array.isArray(result?.props?.children)).toBe(true);
    });

    it("renders when item.audio is set (withAudio true)", () => {
      const item = createMockItem({ audio: "https://example.com/audio.mp3" });
      const view = new HtxParagraphsView({ item });
      const result = view.render();
      expect(result).toBeTruthy();
    });
  });

  describe("_handleUpdate", () => {
    it("returns early when item._value is falsy", () => {
      const item = createMockItem({ _value: null });
      const view = new HtxParagraphsView({ item });
      view.myRef = { current: document.createElement("div") };
      view._handleUpdate();
      expect(view.myRef.current).toBeTruthy();
    });

    it("skips regs that have connected spans", () => {
      const item = createMockItem({
        _value: [{ text: "Hi" }],
        regs: [{ _spans: [{ isConnected: true }] }],
      });
      const root = document.createElement("div");
      root.getElementsByTagName = () => [];
      const view = new HtxParagraphsView({ item });
      view.myRef = { current: root };
      view._handleUpdate();
    });

    it("catches errors when reg phrase node is missing and logs", () => {
      const item = createMockItem({
        _value: [{ text: "Hi" }],
        regs: [{ start: 0, end: 0, startOffset: 0, endOffset: 2, _spans: [{ isConnected: false }] }],
      });
      const root = document.createElement("div");
      root.getElementsByTagName = () => [];
      const badChild = document.createElement("div");
      badChild.getElementsByClassName = () => [];
      root.appendChild(badChild);
      const view = new HtxParagraphsView({ item });
      view.myRef = { current: root };
      view.shouldScroll = jest.fn(() => false);
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      view._handleUpdate();
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it("adds click listener to anchor elements", () => {
      const item = createMockItem({
        _value: [{ text: "Hi" }],
        regs: [{ _spans: [{ isConnected: true }] }],
      });
      const anchor = document.createElement("a");
      anchor.href = "#";
      const addEventListener = jest.fn();
      anchor.addEventListener = addEventListener;
      const root = document.createElement("div");
      root.getElementsByTagName = jest.fn((tag) => (tag === "a" ? [anchor] : []));
      const view = new HtxParagraphsView({ item });
      view.myRef = { current: root };
      view.state = { canScroll: false, inViewPort: true };
      view._handleUpdate();
      expect(addEventListener).toHaveBeenCalledWith("click", expect.any(Function));
    });

    it("calls handleNormalPhraseScroll when shouldScroll and phrase not tall", () => {
      const item = createMockItem({
        _value: [{ text: "Hi", start: 0, end: 1, duration: 1 }],
        playingId: 0,
        regs: [{ _spans: [{ isConnected: true }] }],
      });
      const root = document.createElement("div");
      root.getElementsByTagName = () => [];
      root.appendChild(document.createElement("div"));
      Object.defineProperty(root, "offsetHeight", { value: 200, configurable: true });
      const view = new HtxParagraphsView({ item });
      view.myRef = { current: root };
      view.lastPlayingId = -1;
      view.state = { canScroll: true, inViewPort: true };
      view._disposeTimeout = jest.fn();
      view.handleNormalPhraseScroll = jest.fn();
      view.handleTallPhraseScroll = jest.fn();
      view.activeRef = { current: { offsetHeight: 50 } };
      view.shouldScroll = jest.fn(() => true);
      view._handleUpdate();
      expect(view.handleNormalPhraseScroll).toHaveBeenCalled();
      expect(view.lastPlayingId).toBe(0);
    });

    it("calls handleTallPhraseScroll when shouldScroll and phrase taller than container", () => {
      const item = createMockItem({
        _value: [{ text: "Hi", start: 0, end: 1 }],
        playingId: 0,
        regs: [{ _spans: [{ isConnected: true }] }],
      });
      const root = document.createElement("div");
      root.getElementsByTagName = () => [];
      root.appendChild(document.createElement("div"));
      Object.defineProperty(root, "offsetHeight", { value: 100, configurable: true });
      const view = new HtxParagraphsView({ item });
      view.myRef = { current: root };
      view.lastPlayingId = -1;
      view.state = { canScroll: true, inViewPort: true };
      view._disposeTimeout = jest.fn();
      view.handleNormalPhraseScroll = jest.fn();
      view.handleTallPhraseScroll = jest.fn();
      view.activeRef = { current: { offsetHeight: 300, offsetTop: 0 } };
      view.shouldScroll = jest.fn(() => true);
      view._handleUpdate();
      expect(view.handleTallPhraseScroll).toHaveBeenCalledWith(300, 1);
      expect(view.lastPlayingId).toBe(0);
    });
  });

  describe("_handleScrollContainerHeight", () => {
    it("sets container maxHeight inside requestAnimationFrame", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      const container = document.createElement("div");
      view.myRef = { current: container };
      const mainContentView = document.createElement("div");
      mainContentView.getBoundingClientRect = () => ({ top: 50, height: 800 });
      Object.defineProperty(mainContentView, "offsetHeight", { value: 800, configurable: true });
      Object.defineProperty(mainContentView, "firstChild", {
        value: { offsetHeight: 100 },
        configurable: true,
      });
      const annotationView = document.createElement("div");
      Object.defineProperty(annotationView, "offsetHeight", { value: 200, configurable: true });
      document.querySelector = jest.fn((sel) => {
        if (sel === view.mainContentSelector) return mainContentView;
        if (sel === view.mainViewAnnotationSelector) return annotationView;
        return null;
      });
      Object.defineProperty(document.documentElement, "clientHeight", {
        value: 900,
        configurable: true,
      });
      window.getComputedStyle = () => ({ getPropertyValue: () => "0" });
      const raf = jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
        cb(0);
      });
      view._handleScrollContainerHeight();
      expect(container.style.maxHeight).toBeDefined();
      raf.mockRestore();
    });

    it("does not set maxHeight when container is null", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      view.myRef = { current: null };
      const mainContentView = document.createElement("div");
      mainContentView.getBoundingClientRect = () => ({ top: 0, height: 800 });
      Object.defineProperty(mainContentView, "offsetHeight", { value: 800, configurable: true });
      Object.defineProperty(mainContentView, "firstChild", {
        value: { offsetHeight: 100 },
        configurable: true,
      });
      const annotationView = document.createElement("div");
      Object.defineProperty(annotationView, "offsetHeight", { value: 200, configurable: true });
      document.querySelector = jest.fn((sel) => {
        if (sel === view.mainContentSelector) return mainContentView;
        if (sel === view.mainViewAnnotationSelector) return annotationView;
        return null;
      });
      window.getComputedStyle = () => ({ getPropertyValue: () => "0" });
      const raf = jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
        cb(0);
      });
      expect(() => view._handleScrollContainerHeight()).not.toThrow();
      raf.mockRestore();
    });
  });

  describe("componentDidUpdate", () => {
    it("calls _handleUpdate", () => {
      const item = createMockItem();
      const view = new HtxParagraphsView({ item });
      view._handleUpdate = jest.fn();
      view.componentDidUpdate();
      expect(view._handleUpdate).toHaveBeenCalled();
    });
  });

  describe("componentDidMount", () => {
    beforeEach(() => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_LSDV_E_278 || flag === FF_NER_SELECT_ALL);
    });

    it("calls setViewRef when FF_NER_SELECT_ALL", () => {
      const setViewRef = jest.fn();
      const item = createMockItem({ setViewRef });
      const view = new HtxParagraphsView({ item });
      view._resizeObserver = { observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() };
      view._handleUpdate = jest.fn();
      view.componentDidMount();
      expect(setViewRef).toHaveBeenCalledWith(view);
    });

    it("calls seekToPhrase(0) when no audio and playingId -1", () => {
      const seekToPhrase = jest.fn();
      const item = createMockItem({
        audio: null,
        playingId: -1,
        setViewRef: jest.fn(),
        seekToPhrase,
      });
      const view = new HtxParagraphsView({ item });
      view._resizeObserver = { observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() };
      view._handleUpdate = jest.fn();
      document.querySelector = jest.fn(() => document.createElement("div"));
      view.componentDidMount();
      expect(seekToPhrase).toHaveBeenCalledWith(0);
    });
  });

  describe("componentWillUnmount", () => {
    beforeEach(() => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_LSDV_E_278 || flag === FF_NER_SELECT_ALL);
    });

    it("calls setViewRef(null) and disconnects resize observer", () => {
      const setViewRef = jest.fn();
      const item = createMockItem({ setViewRef });
      const view = new HtxParagraphsView({ item });
      const target = document.createElement("div");
      view._resizeObserver = { observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() };
      document.querySelector = jest.fn(() => target);
      view.componentWillUnmount();
      expect(setViewRef).toHaveBeenCalledWith(null);
      expect(view._resizeObserver.unobserve).toHaveBeenCalledWith(target);
      expect(view._resizeObserver.disconnect).toHaveBeenCalled();
    });

    it("disconnects without unobserve when mainContentSelector target is null", () => {
      const setViewRef = jest.fn();
      const item = createMockItem({ setViewRef });
      const view = new HtxParagraphsView({ item });
      view._resizeObserver = { observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() };
      document.querySelector = jest.fn(() => null);
      view.componentWillUnmount();
      expect(view._resizeObserver.unobserve).not.toHaveBeenCalled();
      expect(view._resizeObserver.disconnect).toHaveBeenCalled();
    });
  });

  describe("getRegionsForPhrase edge cases", () => {
    beforeEach(() => {
      const { isFF } = require("../../../../utils/feature-flags");
      isFF.mockImplementation((flag) => flag === FF_LSDV_E_278 || flag === FF_NER_SELECT_ALL);
    });

    it("filters out regions with non-numeric start or end", () => {
      const validRegion = { start: "0", end: "1" };
      const invalidRegion = { start: "x", end: "1" };
      const item = createMockItem({
        annotation: { regionStore: { regions: [validRegion, invalidRegion] } },
      });
      const view = new HtxParagraphsView({ item });
      const result = view.getRegionsForPhrase(0);
      expect(result).toContain(validRegion);
      expect(result).not.toContain(invalidRegion);
    });
  });
});
