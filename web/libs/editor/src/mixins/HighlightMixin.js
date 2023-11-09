import { types } from 'mobx-state-tree';

import Utils from '../utils';
import { guidGenerator } from '../utils/unique';
import Constants, { defaultStyle } from '../core/Constants';
import { isDefined } from '../utils/utilities';
import { FF_LSDV_4620_3, isFF } from '../utils/feature-flags';

const HIGHLIGHT_CN = 'htx-highlight';
const HIGHLIGHT_NO_LABEL_CN = 'htx-no-label';
const IDENTIFIER_LENGTH = 5;
const LABEL_COLOR_ALPHA = 0.3;

export const HighlightMixin = types
  .model()
  .views(self => ({
    get _hasSpans() {
      // @todo is it possible that only some spans are connected?
      return self._spans ? (
        self._spans.every(span => span.isConnected)
      ) : false;
    },
    get identifier() {
      return `${self.id.split('#')[0]}-${self.ouid}`;
    },
    get className() {
      return `${HIGHLIGHT_CN}-${self.identifier}`;
    },
    get classNames() {
      const classNames = [HIGHLIGHT_CN, self.className];

      if (!(self.parent.showlabels ?? self.store.settings.showLabels)) {
        classNames.push(HIGHLIGHT_NO_LABEL_CN);
      }

      // in this case labels presence can't be changed from settings — manual mode
      if (isDefined(self.parent.showlabels)) {
        classNames.push('htx-manual-label');
      }

      return classNames;
    },
    get styles() {
      const { className } = self;
      const activeColorOpacity = 0.8;
      const color = self.getLabelColor();
      const initialActiveColor = Utils.Colors.rgbaChangeAlpha(color, activeColorOpacity);

      return `
        .${className} {
          background-color: ${color} !important;
          border: 1px dashed transparent;
        }
        .${className}.${STATE_CLASS_MODS.active}:not(.${STATE_CLASS_MODS.hidden}) {
          color: ${Utils.Colors.contrastColor(initialActiveColor)} !important;
          background-color: ${initialActiveColor} !important;
        }
      `;
    },
  }))
  .actions(self => ({
    /**
     * Create highlights from the stored `Range`
     */
    applyHighlight(init = false) {
      if (isFF(FF_LSDV_4620_3)) {
        // skip re-initing
        if (self._hasSpans) {
          return void 0;
        }

        self._spans = self.parent.createSpansByGlobalOffsets(self.globalOffsets);
        self._spans?.forEach(span => span.className = self.classNames.join(' '));
        self.updateSpans();
        if (!init) {
          self.parent.setStyles({ [self.identifier]: self.styles });
        }
        return void 0;
      }

      if (self.parent.isLoaded === false) {
        return void 0;
      }

      // spans in iframe disappear on every annotation switch, so check for it
      // in iframe spans still isConnected, but window is missing
      const isReallyConnected = Boolean(self._spans?.[0]?.ownerDocument?.defaultView);

      // Avoid calling this method twice
      if (self._hasSpans && isReallyConnected) {
        return void 0;
      }

      const range = self.getRangeToHighlight();
      const root = self._getRootNode();

      // Avoid rendering before view is ready
      if (!range) {
        console.warn('No range found to highlight');
        return void 0;
      }

      if (!root) {
        return void 0;
      }

      const labelColor = self.getLabelColor();
      const identifier = guidGenerator(IDENTIFIER_LENGTH);
      // @todo use label-based stylesheets created only once
      const stylesheet = createSpanStylesheet(root.ownerDocument, identifier, labelColor);
      const classNames = ['htx-highlight', stylesheet.className];

      if (!(self.parent.showlabels ?? self.store.settings.showLabels)) {
        classNames.push(HIGHLIGHT_NO_LABEL_CN);
      }

      // in this case labels presence can't be changed from settings — manual mode
      if (isDefined(self.parent.showlabels)) {
        classNames.push('htx-manual-label');
      }

      self._stylesheet = stylesheet;
      self._spans = Utils.Selection.highlightRange(range, {
        classNames,
        label: self.getLabels(),
      });

      return self._spans;
    },

    updateHighlightedText() {
      if (!self.text) {
        if (isFF(FF_LSDV_4620_3)) {
          self.text = self.parent.getTextFromGlobalOffsets(self.globalOffsets);
          return;
        }
        // Concatenating of spans' innerText is up to 10 times faster, but loses "\n"
        const range = self.getRangeToHighlight();
        const root = self._getRootNode();

        if (!range || !root) {
          return;
        }
        const selection = root.ownerDocument.defaultView.getSelection();

        selection.removeAllRanges();
        selection.addRange(range);
        self.text = String(selection);
        selection.removeAllRanges();
      }
    },

    updateSpans() {
      if (self._hasSpans || (isFF(FF_LSDV_4620_3) && self._spans?.length)) {
        const lastSpan = self._spans[self._spans.length - 1];

        Utils.Selection.applySpanStyles(lastSpan, { label: self.getLabels() });
      }
    },

    /**
     * Removes current highlights
     */
    removeHighlight() {
      if (isFF(FF_LSDV_4620_3)) {
        if (self.globalOffsets) {
          self.parent?.removeSpansInGlobalOffsets(self._spans, self.globalOffsets);
        }
        self.parent?.removeStyles([self.identifier]);
      } else {
        Utils.Selection.removeRange(self._spans);
      }
    },

    /**
     * Update region's appearance if the label was changed
     */
    updateAppearenceFromState() {
      if (!self._spans) {
        return;
      }

      const lastSpan = self._spans[self._spans.length - 1];

      if (isFF(FF_LSDV_4620_3)) {
        self.parent.setStyles?.({ [self.identifier]: self.styles });
      } else {
        self._stylesheet.setColor(self.getLabelColor());
      }
      Utils.Selection.applySpanStyles(lastSpan, { label: self.getLabels() });
    },

    /**
     * Make current region selected
     */
    selectRegion() {
      self.annotation.setHighlightedNode(self);

      self.addClass(STATE_CLASS_MODS.active);

      const first = self._spans?.[0];

      if (!first) {
        return;
      }

      if (first.scrollIntoViewIfNeeded) {
        first.scrollIntoViewIfNeeded();
      } else {
        first.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    },

    /**
     * Unselect text region
     */
    afterUnselectRegion() {
      self.removeClass(isFF(FF_LSDV_4620_3) ? STATE_CLASS_MODS.active : self._stylesheet?.state.active);
    },

    /**
     * Remove stylesheet before removing the highlight itself
     */
    beforeDestroy() {
      if (isFF(FF_LSDV_4620_3)) {
        self.parent?.removeStyles([self.identifier]);
      } else {
        try {
          self._stylesheet.remove();
        } catch (e) { /* something went wrong */ }
      }
    },

    /**
     * Set cursor style of the region
     * @param {import("prettier").CursorOptions} cursor
     */
    setCursor(cursor) {
      self._stylesheet?.setCursor(cursor);
    },

    /**
     * Draw region outline
     * @param {boolean} val
     */
    setHighlight(val) {
      if (!self._stylesheet && !(isFF(FF_LSDV_4620_3) && self._spans)) {
        return;
      }

      self._highlighted = val;

      if (self.highlighted) {
        if (isFF(FF_LSDV_4620_3)) {
          self.addClass(STATE_CLASS_MODS.highlighted);
        } else {
          self.addClass(self._stylesheet.state.highlighted);
          self._stylesheet?.setCursor(Constants.RELATION_MODE_CURSOR);
        }
      } else {
        if (isFF(FF_LSDV_4620_3)) {
          self.removeClass(STATE_CLASS_MODS.highlighted);
        } else {
          self.removeClass(self._stylesheet.state.highlighted);
          self._stylesheet?.setCursor(Constants.POINTER_CURSOR);
        }
      }
    },

    getLabels() {
      return (self.labeling?.selectedLabels ?? []).map(label => label.value).join(',');
    },

    getLabelColor() {
      const labelColor = self.parent.highlightcolor || (self.style || self.tag || defaultStyle).fillcolor;

      return Utils.Colors.convertToRGBA(labelColor ?? '#DA935D', LABEL_COLOR_ALPHA);
    },

    find(span) {
      return self._spans && self._spans.indexOf(span) >= 0 ? self : undefined;
    },

    /**
     * Add classes to all spans
     * @param {string[]} classNames
     */
    addClass(classNames) {
      if (!classNames || !self._spans) {
        return;
      }
      const classList = [].concat(classNames); // convert any input to array

      self._spans.forEach(span => span.classList.add(...classList));
    },

    /**
     * Remove classes from all spans
     * @param {string[]} classNames
     */
    removeClass(classNames) {
      if (!classNames || !self._spans) {
        return;
      }
      const classList = [].concat(classNames); // convert any input to array

      self._spans.forEach(span => span.classList.remove(...classList));
    },

    toggleHidden(e) {
      self.hidden = !self.hidden;
      if (self.hidden) {
        self.addClass('__hidden');
      } else {
        self.removeClass('__hidden');
      }

      e?.stopPropagation();
    },
  }));



export const STATE_CLASS_MODS = {
  active: '__active',
  highlighted: '__highlighted',
  collapsed: '__collapsed',
  hidden: '__hidden',
  noLabel: HIGHLIGHT_NO_LABEL_CN,
};

/**
 * Creates a separate stylesheet for every region
 * @param {string} identifier GUID identifier of a region
 * @param {string} color Default label color
 */
const createSpanStylesheet = (document, identifier, color) => {
  const className = `.htx-highlight-${identifier}`;
  const variables = {
    color: `--background-color-${identifier}`,
    cursor: `--cursor-style-${identifier}`,
  };

  const classNames = {
    active: `${className}.${STATE_CLASS_MODS.active}:not(.${STATE_CLASS_MODS.hidden})`,
    highlighted: `${className}.${STATE_CLASS_MODS.highlighted}`,
  };

  const activeColorOpacity = 0.8;
  const toActiveColor = color => Utils.Colors.rgbaChangeAlpha(color, activeColorOpacity);

  const initialActiveColor = toActiveColor(color);

  document.documentElement.style.setProperty(variables.color, color);

  const rules = {
    [className]: `
      background-color: var(${variables.color}) !important;
      cursor: var(${variables.cursor}, pointer);
      border: 1px dashed transparent;
    `,
    [`${className}[data-label]::after`]: `
      padding: 2px 2px;
      font-size: 9.5px;
      font-weight: bold;
      font-family: Monaco;
      vertical-align: super;
      content: attr(data-label);
      line-height: 0;
    `,
    [classNames.active]: `
      color: ${Utils.Colors.contrastColor(initialActiveColor)} !important;
      ${variables.color}: ${initialActiveColor}
    `,
    [classNames.highlighted]: `
      position: relative;
      border-color: rgb(0, 174, 255);
    `,
    [`${className}.${STATE_CLASS_MODS.hidden}`]: `
      border: none;
      padding: 0;
      pointer-events: none;
      ${variables.color}: transparent;
    `,
    [`${className}.${STATE_CLASS_MODS.hidden}::before`]: `
      display: none
    `,
    [`${className}.${STATE_CLASS_MODS.hidden}::after`]: `
      display: none
    `,
    [`${className}.${STATE_CLASS_MODS.noLabel}::after`]: `
      display: none
    `,
  };

  const styleTag = document.createElement('style');

  styleTag.type = 'text/css';
  styleTag.id = `highlight-${identifier}`;
  document.head.appendChild(styleTag);

  const stylesheet = styleTag.sheet ?? styleTag.styleSheet;
  const supportInsertion = !!stylesheet.insertRule;
  let lastRuleIndex = 0;

  for (const ruleName in rules) {
    if (!Object.prototype.hasOwnProperty.call(rules, ruleName)) {
      continue;
    }
    if (supportInsertion) {
      stylesheet.insertRule(`${ruleName} { ${rules[ruleName]} } `, lastRuleIndex++);
    } else {
      stylesheet.addRule(ruleName, rules);
    }
  }

  /**
   * Set region color
   * @param {string} color
   */
  const setColor = color => {
    const newActiveColor = toActiveColor(color);
    // sheet could change during iframe transfers, so look up in the tag
    const stylesheet = styleTag.sheet ?? styleTag.styleSheet;
    // they are on different positions for old/new regions
    const rule = [...stylesheet.rules].find(rule => rule.selectorText.includes('__active'));
    const { style } = rule;

    // document in a closure may be a working iframe, so go up from the tag
    styleTag.ownerDocument.documentElement.style.setProperty(variables.color, color);

    style.setProperty(variables.color, newActiveColor);
    style.color = Utils.Colors.contrastColor(newActiveColor);
  };

  /**
   * Set cursor style
   * @param {string} cursor
   */
  const setCursor = cursor => {
    styleTag.ownerDocument.documentElement.style.setProperty(variables.cursor, cursor);
  };

  /**
   * Remove stylesheet
   */
  const remove = () => {
    styleTag.remove();
  };

  return {
    className: className.substr(1),
    state: STATE_CLASS_MODS,
    setColor,
    setCursor,
    remove,
  };
};

