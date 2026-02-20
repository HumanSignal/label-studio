const { centerOfBbox } = require("../tests/helpers");
const { I } = inject();

/**
 * Helper to test draggable panels like Details and Outliner.
 * They are selected by providing one of PANEL selectors to constructor (see exports).
 */
class Panel {
  container = ".lsf-sidepanels";
  root = ".lsf-panel, .lsf-tabs-panel";
  detached = ".lsf-panel_detached, .lsf-tabs-panel_detached";
  aligmentLeft = ".lsf-panel_alignment_left, .lsf-tabs-panel_alignment_left";
  aligmentRight = ".lsf-panel_alignment_right, .lsf-tabs-panel_alignment_right";
  header = ".lsf-panel__header";
  tabsHeader = ".lsf-tabs-panel__header";
  body = ".lsf-panel__body";
  tabsBody = ".lsf-tabs-panel__body";
  title = ".lsf-panel__title";

  leftZone = ".lsf-sidepanels__wrapper_align_left";
  rightZone = ".lsf-sidepanels__wrapper_align_right";

  collapsingToggle = '[class*="__toggle"]';
  collapseButton = '[class*="__toggle"][data-tooltip*="Collapse"]';
  expandButton = '[class*="__toggle"][data-tooltip*="Expand"]';
  collapseGroupButton = '[class*="__toggle"][data-tooltip*="Collapse Group"]';
  expandGroupButton = '[class*="__toggle"][data-tooltip*="Expand Group"]';
  tabsRightCollapseButton = '.lsf-tabs-panel_alignment_right [data-tooltip="Collapse"]';
  tabsRightExpandButton = '.lsf-tabs-panel_alignment_right [data-tooltip="Expand"]';

  resizeTopLeft = '[data-resize="top-left"]';
  resizeTopRight = '[data-resize="top-right"]';
  resizeBottomLeft = '[data-resize="bottom-left"]';
  resizeBottomRight = '[data-resize="bottom-right"]';
  resizeTop = '[data-resize="top"]';
  resizeBottom = '[data-resize="bottom"]';
  resizeLeft = '[data-resize="left"]';
  resizeRight = '[data-resize="right"]';

  constructor(selector) {
    this.selector = selector;
  }
  panelIdBySelector() {
    if (this.selector === ".lsf-outliner") return "regions-relations";
    if (this.selector === ".lsf-details") return "info-history";
    return null;
  }
  panelSelectors() {
    const panelId = this.panelIdBySelector();
    const legacy = this.selector ? `.lsf-panel${this.selector}` : ".lsf-panel";
    const tabs = panelId ? `.lsf-tabs-panel:has(.lsf-tabs-panel__header#${panelId})` : ".lsf-tabs-panel";

    return { legacy, tabs };
  }
  toggleSelectors() {
    const { legacy, tabs } = this.panelSelectors();

    return {
      collapse: `${legacy} ${this.collapseButton}, ${tabs} ${this.collapseButton}, ${tabs} ${this.collapseGroupButton}, ${this.tabsRightCollapseButton}`,
      expand: `${legacy} ${this.expandButton}, ${tabs} ${this.expandButton}, ${tabs} ${this.expandGroupButton}, ${this.tabsRightExpandButton}`,
    };
  }
  scopedSelector(legacySelector, tabsSelector = legacySelector) {
    const { legacy, tabs } = this.panelSelectors();

    return `${legacy} ${legacySelector}, ${tabs} ${tabsSelector}`;
  }
  locatePanel(stateSelector = "") {
    const { legacy, tabs } = this.panelSelectors();

    return locate(`${legacy}${stateSelector}, ${tabs}${stateSelector}`);
  }
  locate(locator) {
    return locator ? locate(locator).inside(this.locatePanel()) : this.locatePanel();
  }
  seePanel() {
    I.seeElement(this.locatePanel());
  }
  seePanelAttachedLeft() {
    const { legacy, tabs } = this.panelSelectors();

    I.seeElement(
      `${this.leftZone} ${legacy}.lsf-panel_alignment_left:not(.lsf-panel_detached), ${this.leftZone} ${tabs}.lsf-tabs-panel_alignment_left:not(.lsf-tabs-panel_detached)`,
    );
  }
  seePanelAttachedRight() {
    const { legacy, tabs } = this.panelSelectors();

    I.seeElement(
      `${this.rightZone} ${legacy}.lsf-panel_alignment_right:not(.lsf-panel_detached), ${this.rightZone} ${tabs}.lsf-tabs-panel_alignment_right:not(.lsf-tabs-panel_detached)`,
    );
  }
  seePanelDetached() {
    const { legacy, tabs } = this.panelSelectors();

    I.seeElement(`${legacy}.lsf-panel_detached, ${tabs}.lsf-tabs-panel_detached`);
  }
  seePanelBody() {
    I.seeElement(this.scopedSelector(this.body, this.tabsBody));
  }
  dontSeePanelBody() {
    I.dontSeeElement(this.scopedSelector(this.body, this.tabsBody));
  }
  collapsePanel() {
    const panelId = this.panelIdBySelector();
    const { legacy } = this.panelSelectors();

    I.executeScript(
      ({ legacySelector, panelId, collapseSelector, collapseGroupSelector }) => {
        const tabsHeader = panelId ? document.getElementById(panelId) : null;
        const tabsRoot = tabsHeader?.closest(".lsf-tabs-panel");
        const scopedRightCollapseButton = tabsRoot?.matches(".lsf-tabs-panel_alignment_right")
          ? tabsRoot.querySelector('[data-tooltip="Collapse"]')
          : null;

        if (scopedRightCollapseButton) {
          scopedRightCollapseButton.click();
          return;
        }

        const roots = [];
        const legacyRoot = document.querySelector(legacySelector);

        if (legacyRoot) roots.push(legacyRoot);
        if (panelId) {
          const tabsHeader = document.getElementById(panelId);
          const tabsRoot = tabsHeader?.closest(".lsf-tabs-panel");

          if (tabsRoot) roots.push(tabsRoot);
        }

        for (const root of roots) {
          const collapseButton = root.querySelector(collapseSelector) || root.querySelector(collapseGroupSelector);

          if (collapseButton) {
            collapseButton.click();
            return;
          }
        }
      },
      {
        legacySelector: legacy,
        panelId,
        collapseSelector: this.collapseButton,
        collapseGroupSelector: this.collapseGroupButton,
      },
    );
    // Allow some tags to rerender and get new sizes before we can continue testing things
    I.wait(1);
  }
  expandPanel() {
    const panelId = this.panelIdBySelector();
    const { legacy } = this.panelSelectors();

    I.executeScript(
      ({ legacySelector, panelId, expandSelector, expandGroupSelector, legacyHeaderSelector }) => {
        const tabsHeader = panelId ? document.getElementById(panelId) : null;
        const tabsRoot = tabsHeader?.closest(".lsf-tabs-panel");
        const scopedRightExpandButton = tabsRoot?.matches(".lsf-tabs-panel_alignment_right")
          ? tabsRoot.querySelector('[data-tooltip="Expand"]')
          : null;

        if (scopedRightExpandButton) {
          scopedRightExpandButton.click();
          return;
        }

        const roots = [];
        const legacyRoot = document.querySelector(legacySelector);

        if (legacyRoot) roots.push(legacyRoot);
        if (panelId) {
          const tabsHeader = document.getElementById(panelId);
          const tabsRoot = tabsHeader?.closest(".lsf-tabs-panel");

          if (tabsRoot) roots.push(tabsRoot);
        }

        for (const root of roots) {
          const expandButton = root.querySelector(expandSelector) || root.querySelector(expandGroupSelector);

          if (expandButton) {
            expandButton.click();
            return;
          }
        }

        // Fallback click on panel header if explicit expand button is absent.
        const fallbackHeader = document.querySelector(legacyHeaderSelector) || document.getElementById(panelId);
        fallbackHeader?.click();
      },
      {
        legacySelector: legacy,
        panelId,
        expandSelector: this.expandButton,
        expandGroupSelector: this.expandGroupButton,
        legacyHeaderSelector: `${legacy} ${this.header}`,
      },
    );
  }
  seeExpandButton() {
    I.dontSeeElement(this.scopedSelector(this.body, this.tabsBody));
  }
  dontSeeExpandButton() {
    I.dontSeeElement(this.scopedSelector(this.expandButton));
  }
  seeСollapseButton() {
    I.seeElement(this.scopedSelector(this.collapseButton));
  }
  dontSeeСollapseButton() {
    I.dontSeeElement(this.scopedSelector(this.collapseButton));
  }
  async grabHeaderBbox(elementSize) {
    const panelId = this.panelIdBySelector();
    const { legacy } = this.panelSelectors();
    const bbox = await I.executeScript(
      ({ legacySelector, panelId }) => {
        const legacyRoot = document.querySelector(legacySelector);
        const tabsHeader = panelId ? document.getElementById(panelId) : null;
        const tabsRoot = tabsHeader?.closest(".lsf-tabs-panel");
        const header =
          legacyRoot?.querySelector(".lsf-panel__header") ?? tabsRoot?.querySelector(".lsf-tabs-panel__header");
        const target = header ?? legacyRoot ?? tabsRoot ?? document.querySelector(".lsf-sidepanels");

        if (!target) return null;

        const rect = target.getBoundingClientRect();

        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        };
      },
      { legacySelector: legacy, panelId },
    );

    if (!bbox) return null;

    return elementSize ? bbox[elementSize] : bbox;
  }
  async grabPanelBbox(elementSize) {
    return I.grabElementBoundingRect(this.locatePanel(), elementSize);
  }
  async grabPanelsContainerBbox(elementSize) {
    return I.grabElementBoundingRect(this.container, elementSize);
  }
  async dragPanelBy(shiftX, shiftY, steps = 1) {
    const fromBbox = await this.grabHeaderBbox();
    if (!fromBbox) return;
    const fromPoint = centerOfBbox(fromBbox);
    const toPoint = {
      x: fromPoint.x + shiftX,
      y: fromPoint.y + shiftY,
    };

    return await I.dragAndDropMouse(fromPoint, toPoint, "left", steps);
  }
  async dragPanelTo(x, y, steps = 1) {
    const fromBbox = await this.grabHeaderBbox();
    if (!fromBbox) return;
    const fromPoint = centerOfBbox(fromBbox);
    const toPoint = {
      x,
      y,
    };

    return await I.dragAndDropMouse(fromPoint, toPoint, "left", steps);
  }
  async dragPanelToElement(locator, steps = 1) {
    const fromBbox = await this.grabHeaderBbox();
    if (!fromBbox) return;
    const toBbox = await I.grabElementBoundingRect(locator);
    const fromPoint = centerOfBbox(fromBbox);
    const toPoint = centerOfBbox(toBbox);

    return await I.dragAndDropMouse(fromPoint, toPoint, "left", steps);
  }
  async dragPanelToLeftSocket(steps = 1) {
    return await this.dragPanelToElement(this.leftZone, steps);
  }
  async dragPanelToRightSocket(steps = 1) {
    return await this.dragPanelToElement(this.rightZone, steps);
  }

  async dragResizerBy(shiftX, shiftY, resizerSelector, steps = 1) {
    const fromBbox = await I.grabElementBoundingRect(this.scopedSelector(resizerSelector));
    const fromPoint = centerOfBbox(fromBbox);
    const toPoint = {
      x: fromPoint.x + shiftX,
      y: fromPoint.y + shiftY,
    };

    return await I.dragAndDropMouse(fromPoint, toPoint, "left", steps);
  }
}

module.exports = new Panel();
module.exports.PANEL = {
  OUTLINER: ".lsf-outliner",
  DETAILS: ".lsf-details",
};
module.exports.usePanel = (panel) => {
  return new Panel(panel);
};
