const { centerOfBbox } = require('../tests/helpers');
const { I } = inject();

/**
 * Helper to test draggable panels like Details and Outliner.
 * They are selected by providing one of PANEL selectors to constructor (see exports).
 */
class Panel {
  container = '.lsf-sidepanels';
  root = '.lsf-panel';
  detached = '.lsf-panel_detached';
  aligmentLeft = '.lsf-panel_alignment_left';
  aligmentRight = '.lsf-panel_alignment_right';
  header = '.lsf-panel__header';
  body = '.lsf-panel__body';
  title = '.lsf-panel__title';

  leftZone = '.lsf-sidepanels__wrapper_align_left';
  rightZone = '.lsf-sidepanels__wrapper_align_right';

  collapsingToggle = '.lsf-panel__toggle';
  collapsedToggle = '.lsf-panel__toggle_enabled';
  collapseButton = `${this.collapsingToggle}${this.collapsedToggle}`;
  expandButton = `${this.collapsingToggle}:not(${this.collapsedToggle})`;

  resizeTopLeft = '[data-resize="top-left"]';
  resizeTopRight = '[data-resize="top-right"]';
  resizeBottomLeft = '[data-resize="bottom-left"]';
  resizeBottomRight = '[data-resize="bottom-right"]';
  resizeTop = '[data-resize="top"]';
  resizeBottom = '[data-resize="bottom"]';
  resizeLeft = '[data-resize="left"]';
  resizeRight = '[data-resize="right"]';

  constructor(selector) {
    this.root = selector ? `${this.root}${selector}` : this.root;
  }
  locatePanel(stateSelector = '') {
    return locate(this.root + stateSelector);
  }
  locate(locator) {
    return locator ? locate(locator).inside(this.locatePanel()) : this.locatePanel();
  }
  seePanel() {
    I.seeElement(this.locatePanel());
  }
  seePanelAttachedLeft() {
    I.seeElement(this.locatePanel(`${this.aligmentLeft}:not(${this.detached})`).inside(this.leftZone));
  }
  seePanelAttachedRight() {
    I.seeElement(this.locatePanel(`${this.aligmentRight}:not(${this.detached})`).inside(this.rightZone));
  }
  seePanelDetached() {
    I.seeElement(this.locatePanel(this.detached));
  }
  seePanelBody() {
    I.seeElement(this.locate(this.body));
  }
  dontSeePanelBody() {
    I.dontSeeElement(this.locate(this.body));
  }
  collapsePanel() {
    I.click(this.locate(this.collapsingToggle));
  }
  expandPanel() {
    I.click(this.locate(this.header));
  }
  seeExpandButton() {
    I.seeElement(this.locate(this.expandButton));
  }
  dontSeeExpandButton() {
    I.dontSeeElement(this.locate(this.expandButton));
  }
  seeСollapseButton() {
    I.seeElement(this.locate(this.collapseButton));
  }
  dontSeeСollapseButton() {
    I.dontSeeElement(this.locate(this.collapseButton));
  }
  async grabHeaderBbox(elementSize) {
    return I.grabElementBoundingRect(this.locate(this.header), elementSize);
  }
  async grabPanelBbox(elementSize) {
    return I.grabElementBoundingRect(this.locatePanel(), elementSize);
  }
  async grabPanelsContainerBbox(elementSize) {
    return I.grabElementBoundingRect(this.container, elementSize);
  }
  async dragPanelBy(shiftX, shiftY, steps = 1) {
    const fromBbox = await this.grabHeaderBbox();
    const fromPoint = centerOfBbox(fromBbox);
    const toPoint = {
      x: fromPoint.x + shiftX,
      y: fromPoint.y + shiftY,
    };

    return await I.dragAndDropMouse(
      fromPoint,
      toPoint,
      'left',
      steps,
    );
  }
  async dragPanelTo(x, y, steps = 1) {
    const fromBbox = await this.grabHeaderBbox();
    const fromPoint = centerOfBbox(fromBbox);
    const toPoint = {
      x,
      y,
    };

    return await I.dragAndDropMouse(
      fromPoint,
      toPoint,
      'left',
      steps,
    );
  }
  async dragPanelToElement(locator, steps = 1) {
    const fromBbox = await this.grabHeaderBbox();
    const toBbox = await I.grabElementBoundingRect(locator);
    const fromPoint = centerOfBbox(fromBbox);
    const toPoint = centerOfBbox(toBbox);

    return await I.dragAndDropMouse(
      fromPoint,
      toPoint,
      'left',
      steps,
    );
  }
  async dragPanelToLeftSocket(steps = 1) {
    return await this.dragPanelToElement(this.leftZone, steps);
  }
  async dragPanelToRightSocket(steps = 1) {
    return await this.dragPanelToElement(this.rightZone, steps);
  }

  async dragResizerBy(shiftX, shiftY, resizerSelector, steps = 1) {
    const fromBbox = await I.grabElementBoundingRect(this.locate(resizerSelector));
    const fromPoint = centerOfBbox(fromBbox);
    const toPoint = {
      x: fromPoint.x + shiftX,
      y: fromPoint.y + shiftY,
    };

    return await I.dragAndDropMouse(
      fromPoint,
      toPoint,
      'left',
      steps,
    );
  }
}

module.exports = new Panel();
module.exports.PANEL = {
  OUTLINER: '.lsf-outliner',
  DETAILS: '.lsf-details',
};
module.exports.usePanel = (panel) => {
  return new Panel(panel);
};
