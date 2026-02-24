/**
 * Unit tests for SettingsStore (SettingsModel).
 * Parity: stores/SettingsStore.js target 48.92%.
 */
import SettingsModel from "../SettingsStore";

describe("SettingsStore", () => {
  let localStorageMock;

  beforeEach(() => {
    localStorageMock = {
      getItem: jest.fn().mockReturnValue(null),
      setItem: jest.fn(),
    };
    Object.defineProperty(global, "window", {
      value: { localStorage: localStorageMock },
      writable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates with default values when no localStorage", () => {
    const store = SettingsModel.create({}, { settings: {} });
    expect(store.enableHotkeys).toBe(true);
    expect(store.enableTooltips).toBe(false);
    expect(store.enableLabelTooltips).toBe(true);
    expect(store.showLabels).toBe(false);
    expect(store.showLineNumbers).toBe(false);
    expect(store.continuousLabeling).toBe(false);
    expect(store.selectAfterCreate).toBe(false);
    expect(store.sidePanelMode).toBe("SIDEPANEL_MODE_REGIONS");
    expect(store.preserveSelectedTool).toBe(true);
    expect(store.enableSmoothing).toBe(true);
    expect(store.videoHopSize).toBe(10);
    expect(store.invertedZoom).toBe(false);
  });

  it("displayLabelsByDefault is true when sidePanelMode is SIDEPANEL_MODE_LABELS", () => {
    const store = SettingsModel.create({ sidePanelMode: "SIDEPANEL_MODE_LABELS" }, { settings: {} });
    expect(store.displayLabelsByDefault).toBe(true);
  });

  it("displayLabelsByDefault is false when sidePanelMode is SIDEPANEL_MODE_REGIONS", () => {
    const store = SettingsModel.create({}, { settings: {} });
    expect(store.displayLabelsByDefault).toBe(false);
  });

  it("effectiveBottomSidePanel returns true when forceBottomPanel is true", () => {
    const store = SettingsModel.create({ forceBottomPanel: true, bottomSidePanel: false }, { settings: {} });
    expect(store.effectiveBottomSidePanel).toBe(true);
  });

  it("effectiveBottomSidePanel returns bottomSidePanel when forceBottomPanel is false", () => {
    const store = SettingsModel.create({ forceBottomPanel: false, bottomSidePanel: true }, { settings: {} });
    expect(store.effectiveBottomSidePanel).toBe(true);
    store.toggleBottomSP();
    expect(store.effectiveBottomSidePanel).toBe(false);
  });

  it("beforeDestroy sets isDestroying to true", () => {
    const store = SettingsModel.create({}, { settings: {} });
    expect(store.isDestroying).toBe(false);
    store.beforeDestroy();
    expect(store.isDestroying).toBe(true);
  });

  it("toggleShowLineNumbers toggles showLineNumbers", () => {
    const store = SettingsModel.create({}, { settings: {} });
    expect(store.showLineNumbers).toBe(false);
    store.toggleShowLineNumbers();
    expect(store.showLineNumbers).toBe(true);
    store.toggleShowLineNumbers();
    expect(store.showLineNumbers).toBe(false);
  });

  it("toggleContinuousLabeling toggles continuousLabeling", () => {
    const store = SettingsModel.create({}, { settings: {} });
    store.toggleContinuousLabeling();
    expect(store.continuousLabeling).toBe(true);
    store.toggleContinuousLabeling();
    expect(store.continuousLabeling).toBe(false);
  });

  it("toggleSelectAfterCreate toggles selectAfterCreate", () => {
    const store = SettingsModel.create({}, { settings: {} });
    store.toggleSelectAfterCreate();
    expect(store.selectAfterCreate).toBe(true);
    store.toggleSelectAfterCreate();
    expect(store.selectAfterCreate).toBe(false);
  });

  it("toggleAutoSave toggles enableAutoSave", () => {
    const store = SettingsModel.create({}, { settings: {} });
    store.toggleAutoSave();
    expect(store.enableAutoSave).toBe(true);
    store.toggleAutoSave();
    expect(store.enableAutoSave).toBe(false);
  });

  it("togglepreserveSelectedTool toggles preserveSelectedTool", () => {
    const store = SettingsModel.create({}, { settings: {} });
    expect(store.preserveSelectedTool).toBe(true);
    store.togglepreserveSelectedTool();
    expect(store.preserveSelectedTool).toBe(false);
  });

  it("toggleHotkeys toggles enableHotkeys and calls Hotkey.setScope", () => {
    const { Hotkey } = require("../../core/Hotkey");
    const spy = jest.spyOn(Hotkey, "setScope").mockImplementation(() => {});
    const store = SettingsModel.create({}, { settings: {} });
    store.toggleHotkeys();
    expect(store.enableHotkeys).toBe(false);
    expect(spy).toHaveBeenCalledWith("__none__");
    store.toggleHotkeys();
    expect(store.enableHotkeys).toBe(true);
    expect(spy).toHaveBeenCalledWith(Hotkey.DEFAULT_SCOPE);
    spy.mockRestore();
  });

  it("togglePanelHotkeys toggles enablePanelHotkeys", () => {
    const store = SettingsModel.create({}, { settings: {} });
    store.togglePanelHotkeys();
    expect(store.enablePanelHotkeys).toBe(false);
    store.togglePanelHotkeys();
    expect(store.enablePanelHotkeys).toBe(true);
  });

  it("toggleTooltips toggles enableTooltips", () => {
    const store = SettingsModel.create({}, { settings: {} });
    store.toggleTooltips();
    expect(store.enableTooltips).toBe(true);
    store.toggleTooltips();
    expect(store.enableTooltips).toBe(false);
  });

  it("toggleFullscreen toggles fullscreen", () => {
    const store = SettingsModel.create({}, { settings: {} });
    store.toggleFullscreen();
    expect(store.fullscreen).toBe(true);
    store.toggleFullscreen();
    expect(store.fullscreen).toBe(false);
  });

  it("toggleBottomSP does nothing when forceBottomPanel is true", () => {
    const store = SettingsModel.create({ forceBottomPanel: true, bottomSidePanel: false }, { settings: {} });
    store.toggleBottomSP();
    expect(store.bottomSidePanel).toBe(false);
  });

  it("toggleBottomSP toggles bottomSidePanel when forceBottomPanel is false", () => {
    const store = SettingsModel.create({ forceBottomPanel: false }, { settings: {} });
    store.toggleBottomSP();
    expect(store.bottomSidePanel).toBe(true);
    store.toggleBottomSP();
    expect(store.bottomSidePanel).toBe(false);
  });

  it("toggleImageFS toggles imageFullSize", () => {
    const store = SettingsModel.create({}, { settings: {} });
    store.toggleImageFS();
    expect(store.imageFullSize).toBe(true);
    store.toggleImageFS();
    expect(store.imageFullSize).toBe(false);
  });

  it("toggleLabelTooltips toggles enableLabelTooltips", () => {
    const store = SettingsModel.create({}, { settings: {} });
    expect(store.enableLabelTooltips).toBe(true);
    store.toggleLabelTooltips();
    expect(store.enableLabelTooltips).toBe(false);
  });

  it("toggleAnnotationsPanel toggles showAnnotationsPanel", () => {
    const store = SettingsModel.create({}, { settings: {} });
    store.toggleAnnotationsPanel();
    expect(store.showAnnotationsPanel).toBe(false);
    store.toggleAnnotationsPanel();
    expect(store.showAnnotationsPanel).toBe(true);
  });

  it("togglePredictionsPanel toggles showPredictionsPanel", () => {
    const store = SettingsModel.create({}, { settings: {} });
    store.togglePredictionsPanel();
    expect(store.showPredictionsPanel).toBe(false);
    store.togglePredictionsPanel();
    expect(store.showPredictionsPanel).toBe(true);
  });

  it("toggleSmoothing toggles enableSmoothing", () => {
    const store = SettingsModel.create({}, { settings: {} });
    store.toggleSmoothing();
    expect(store.enableSmoothing).toBe(false);
    store.toggleSmoothing();
    expect(store.enableSmoothing).toBe(true);
  });

  it("setSmoothing sets enableSmoothing", () => {
    const store = SettingsModel.create({}, { settings: {} });
    store.setSmoothing(false);
    expect(store.enableSmoothing).toBe(false);
    store.setSmoothing(true);
    expect(store.enableSmoothing).toBe(true);
  });

  it("toggleInvertedZoom toggles invertedZoom", () => {
    const store = SettingsModel.create({}, { settings: {} });
    store.toggleInvertedZoom();
    expect(store.invertedZoom).toBe(true);
    store.toggleInvertedZoom();
    expect(store.invertedZoom).toBe(false);
  });

  it("setInvertedZoom sets invertedZoom", () => {
    const store = SettingsModel.create({}, { settings: {} });
    store.setInvertedZoom(true);
    expect(store.invertedZoom).toBe(true);
    store.setInvertedZoom(false);
    expect(store.invertedZoom).toBe(false);
  });

  it("setVideoHopSize sets videoHopSize", () => {
    const store = SettingsModel.create({}, { settings: {} });
    store.setVideoHopSize(5);
    expect(store.videoHopSize).toBe(5);
    store.setVideoHopSize(20);
    expect(store.videoHopSize).toBe(20);
  });

  it("setProperty sets arbitrary model property", () => {
    const store = SettingsModel.create({}, { settings: {} });
    store.setProperty("showLabels", true);
    expect(store.showLabels).toBe(true);
    store.setProperty("videoHopSize", 15);
    expect(store.videoHopSize).toBe(15);
  });

  it("toggleProperty toggles arbitrary boolean property", () => {
    const store = SettingsModel.create({}, { settings: {} });
    expect(store.showLabels).toBe(false);
    store.toggleProperty("showLabels");
    expect(store.showLabels).toBe(true);
    store.toggleProperty("showLabels");
    expect(store.showLabels).toBe(false);
  });
});
