import { types, getRoot } from "mobx-state-tree";

import Utils from "../utils";
import Constants, { defaultStyle } from "../core/Constants";
import { isDefined } from "../utils/utilities";

const HIGHLIGHT_CN = "htx-highlight";
const HIGHLIGHT_NO_LABEL_CN = "htx-no-label";
const LABEL_COLOR_ALPHA = 0.3;
const LABEL_COLOR_ALPHA_ACTIVE = 0.8;

export const HighlightMixin = types
  .model()
  .volatile(() => ({
    _spans: null,
  }))
  .views((self) => ({
    get _hasSpans() {
      // @todo is it possible that only some spans are connected?
      // @TODO: Need to check if it is still necessary condition. The way of working with spans was changed and it could affect this part. The main question, is there still a way to get `isConnected === false`
      return self._spans ? self._spans.every((span) => span.isConnected) : false;
    },
    get identifier() {
      return `${self.id.split("#")[0]}-${self.ouid}`;
    },
    get className() {
      return `${HIGHLIGHT_CN}-${self.identifier}`;
    },
    get classNames() {
      const classNames = [HIGHLIGHT_CN, self.className];

      if (!(self.parent.showlabels ?? self.store.settings.showLabels)) {
        classNames.push(HIGHLIGHT_NO_LABEL_CN);
      }

      if (self.selected) {
        classNames.push(STATE_CLASS_MODS.active);
      }

      // in this case labels presence can't be changed from settings — manual mode
      if (isDefined(self.parent.showlabels)) {
        classNames.push("htx-manual-label");
      }

      return classNames;
    },
    /**
     * Generate styles for region and active region, but with a lighter background is that's a resized region,
     * so the selection of the same color will give the original color of active region.
     * @see getColors
     * @param {string} className
     * @param {object} colors see `getColors()`
     * @param {boolean} resize lighter background for resized region or original one for active region
     * @returns {string} styles to apply to the region
     */
    generateStyles(className, colors, resize = false) {
      return `
        .${className} {
          background-color: ${colors.background} !important;
          border: 1px dashed transparent;
        }
        .${className}.${STATE_CLASS_MODS.active}:not(.${STATE_CLASS_MODS.hidden}) {
          color: ${colors.activeText} !important;
          background-color: ${resize ? colors.resizeBackground : colors.activeBackground} !important;
        }
      `;
    },
    get styles() {
      return this.generateStyles(self.className, self.getColors());
    },
    get resizeStyles() {
      return this.generateStyles(self.className, self.getColors(), true);
    },
  }))
  .actions((self) => ({
    /**
     * Create highlights from the stored `Range`
     */
    applyHighlight(init = false) {
      // skip re-initialization
      if (self._hasSpans) {
        return void 0;
      }

      self._spans = self.parent.createSpansByGlobalOffsets(self.globalOffsets);
      self._spans?.forEach((span) => (span.className = self.classNames.join(" ")));
      self.updateSpans();
      if (!init) {
        self.parent.setStyles({ [self.identifier]: self.styles });
      }
      return void 0;
    },

    /**
     * Get text from object tag by region offsets and set it to the region.
     * Normally it would only set it initially for better performance.
     * But when we edit the region we need to update it on every change.
     * @param {object} options
     * @param {boolean} options.force - always update the text
     */
    updateHighlightedText({ force = false } = {}) {
      if (!self.text || force) {
        self.text = self.parent.getTextFromGlobalOffsets(self.globalOffsets);
      }
    },

    updateSpans() {
      // @TODO: Is `_hasSpans` some artifact from the old version?
      if (self._hasSpans || self._spans?.length) {
        const firstSpan = self._spans[0];
        const lastSpan = self._spans.at(-1);
        const offsets = self.globalOffsets;

        // @TODO: Should we manage it in domManager?
        // update label tag (index + attached labels) which sits in the last span
        Utils.Selection.applySpanStyles(lastSpan, { index: self.region_index, label: self.getLabels() });
        // store offsets in spans for further comparison if region got resized
        firstSpan.setAttribute("data-start", offsets.start);
        lastSpan.setAttribute("data-end", offsets.end);
      }
    },

    clearSpans() {
      self._spans = null;
    },

    /**
     * Removes current highlights
     */
    removeHighlight() {
      if (self.globalOffsets) {
        self.parent?.removeSpansInGlobalOffsets(self._spans, self.globalOffsets);
      }
      self.parent?.removeStyles([self.identifier]);
      self._spans = null;
    },

    /**
     * Update region's appearance if the label was changed
     */
    updateAppearenceFromState() {
      if (!self._spans?.length) return;

      // Update label visibility based on settings
      const settings = getRoot(self).settings;
      const lastSpan = self._spans[self._spans.length - 1];

      if (lastSpan) {
        if (!self.parent?.showlabels && !settings?.showLabels) {
          lastSpan.classList.add("htx-no-label");
        } else {
          lastSpan.classList.remove("htx-no-label");
        }
      }

      if (self.parent?.canResizeSpans) {
        const start = self._spans[0].getAttribute("data-start");
        const end = self._spans.at(-1).getAttribute("data-end");
        const offsets = self.globalOffsets;

        // if spans have different offsets stored, then we resized the region and need to recreate spans
        if (isDefined(start) && (+start !== offsets.start || +end !== offsets.end)) {
          self.removeHighlight();
          self.applyHighlight();
        } else {
          self.parent.setStyles?.({ [self.identifier]: self.styles });
          self.updateSpans();
        }
      } else {
        self.parent.setStyles?.({ [self.identifier]: self.styles });
        self.updateSpans();
      }
    },

    /**
     * Attach resize handles to the first and last spans. `area` is used to be less possible to be
     * in user's document. They are not fully valid inside spans, but they work.
     */
    attachHandles() {
      const classes = [STATE_CLASS_MODS.leftHandle, STATE_CLASS_MODS.rightHandle];
      const spanStart = self._spans[0];
      const spanEnd = self._spans.at(-1);

      classes.forEach((resizeClass, index) => {
        // html element that can't be encountered in a usual html
        const handleArea = document.createElement("area");

        handleArea.classList.add(resizeClass);
        index === 0 ? spanStart.prepend(handleArea) : spanEnd.append(handleArea);
      });
    },

    detachHandles() {
      self._spans?.forEach((span) => span.querySelectorAll("area").forEach((area) => area.remove()));
    },

    /**
     * Make current region selected
     */
    selectRegion() {
      self.annotation.setHighlightedNode(self);

      self.addClass(STATE_CLASS_MODS.active);

      const first = self._spans?.[0];

      if (!first) return;

      if (self.parent?.canResizeSpans) {
        self.attachHandles();
      }

      if (first.scrollIntoViewIfNeeded) {
        first.scrollIntoViewIfNeeded();
      } else {
        first.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    },

    /**
     * Unselect text region
     */
    afterUnselectRegion() {
      self.removeClass(STATE_CLASS_MODS.active);

      if (self.parent?.canResizeSpans) {
        self.detachHandles();
      }
    },

    /**
     * Remove stylesheet before removing the highlight itself
     */
    beforeDestroy() {
      self.parent?.removeStyles([self.identifier]);
    },

    /**
     * Draw region outline on hover
     * @param {boolean} val
     */
    setHighlight(val) {
      if (!self._spans) {
        return;
      }

      self._highlighted = val;

      if (self.highlighted) {
        self.addClass(STATE_CLASS_MODS.highlighted);
      } else {
        self.removeClass(STATE_CLASS_MODS.highlighted);
      }
    },

    getLabels() {
      const index = self.region_index;
      const text = (self.labeling?.selectedLabels ?? []).map((label) => label.value).join(",");

      return [index, text].filter(Boolean).join(":");
    },

    // @todo should not this be a view?
    getColors() {
      const labelColor = self.parent.highlightcolor || (self.style || self.tag || defaultStyle).fillcolor;

      const background = Utils.Colors.convertToRGBA(labelColor ?? Constants.LABEL_BACKGROUND, LABEL_COLOR_ALPHA);
      const activeBackground = Utils.Colors.convertToRGBA(
        labelColor ?? Constants.LABEL_BACKGROUND,
        LABEL_COLOR_ALPHA_ACTIVE,
      );
      // Extended/reduced parts of the region should be colored differently in a lighter color.
      // With extension it's simple, because it's the browser selection, so we just set a different color to it.
      // But to color the reduced part we use opacity of overlayed blocks — region hightlight and browser selection,
      // and multiplication of them should be the same as original activeBackground.
      // Region color should also be different from the original one, and for simplicity we use just one color.
      // So this color should have an opacity twice closer to 1 than the original one: 1 - (1 - alpha) * 2
      const resizeBackground = Utils.Colors.convertToRGBA(
        labelColor ?? Constants.LABEL_BACKGROUND,
        2 * LABEL_COLOR_ALPHA_ACTIVE - 1,
      );
      const activeText = Utils.Colors.contrastColor(activeBackground);

      return {
        background,
        activeBackground,
        resizeBackground,
        activeText,
      };
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

      self._spans.forEach((span) => span.classList.add(...classList));
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

      self._spans.forEach((span) => span.classList.remove(...classList));
    },

    toggleHidden(e) {
      self.hidden = !self.hidden;
      if (self.hidden) {
        self.addClass("__hidden");
      } else {
        self.removeClass("__hidden");
      }

      e?.stopPropagation();
    },
  }));

export const STATE_CLASS_MODS = {
  active: "__active",
  highlighted: "__highlighted",
  collapsed: "__collapsed",
  hidden: "__hidden",
  rightHandle: "__resize_right",
  leftHandle: "__resize_left",
  noLabel: HIGHLIGHT_NO_LABEL_CN,
};
