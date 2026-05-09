import * as ff from "@humansignal/core/lib/utils/feature-flags/ff";
import { destroy as destroyNode, flow, types } from "mobx-state-tree";
import { createRef } from "react";
import Constants from "../../../core/Constants";
import { customTypes } from "../../../core/CustomTypes";
import { errorBuilder } from "../../../core/DataValidator/ConfigValidator";
import { cloneNode } from "../../../core/Helpers";
import { AnnotationMixin } from "../../../mixins/AnnotationMixin";
import { STATE_CLASS_MODS } from "../../../mixins/HighlightMixin";
import IsReadyMixin from "../../../mixins/IsReadyMixin";
import ProcessAttrsMixin from "../../../mixins/ProcessAttrs";
import RegionsMixin from "../../../mixins/Regions";
import Utils from "../../../utils";
import { parseValue } from "../../../utils/data";
import { FF_SAFE_TEXT, isFF } from "../../../utils/feature-flags";
import { sanitizeHtml } from "../../../utils/html";
import messages from "../../../utils/messages";
import { rangeToGlobalOffset } from "../../../utils/selection-tools";
import { escapeHtml, isValidObjectURL } from "../../../utils/utilities";
import ObjectBase from "../Base";
import DomManager from "./domManager";

const WARNING_MESSAGES = {
  dataTypeMistmatch: () => "Do not put text directly in task data if you use valueType=url.",
  badURL: (url) => `URL (${escapeHtml(url)}) is not valid.`,
  secureMode: () => 'In SECURE MODE valueType is set to "url" by default.',
  loadingError: (url, error) => `Loading URL (${url}) unsuccessful: ${error}`,
};

/**
 * WARNING: this is not a real doc, that's just a main reference; real docs are in their stub files: HyperText and Text
 *
 * RichText tag shows text or HTML and allows labeling
 * @example
 * <RichText name="text-1" value="$text" granularity="symbol" highlightColor="#ff0000" />
 * @example
 * <Text name="text-1" value="$url" valueType="url" highlightColor="#ff0000" />
 * @example
 * <HyperText name="text-1" value="$html" highlightColor="#ff0000" />
 * @name Text
 * @param {string} name                                   - name of the element
 * @param {string} value                                  - value of the element
 * @param {url|text} [valueType=url|text]                 – source of the data, check (Data retrieval)[https://labelstud.io/guide/tasks.html] page for more inforamtion
 * @param {boolean} [inline=false]                        - whether to embed html directly to LS or use iframe (only HyperText)
 * @param {boolean} [saveTextResult=true]                 – whether or not to save selected text to the serialized data
 * @param {boolean} [selectionEnabled=true]               - enable or disable selection
 * @param {boolean} [clickableLinks=false]                – allow annotator to open resources from links
 * @param {string} [highlightColor]                       - hex string with highlight color, if not provided uses the labels color
 * @param {boolean} [showLabels=true]                     - whether or not to show labels next to the region
 * @param {none|base64|base64unicode} [encoding]          - decode value from an encoded string
 * @param {symbol|word|sentence|paragraph} [granularity]  - control region selection granularity
 */
const TagAttrs = types.model("RichTextModel", {
  value: types.maybeNull(types.string),

  /** Defines the type of data to be shown */
  valuetype: types.optional(types.enumeration(["text", "url"]), () => (window.LS_SECURE_MODE ? "url" : "text")),

  inline: false,

  /** Whether or not to save selected text to the serialized data */
  savetextresult: types.optional(types.enumeration(["none", "no", "yes"]), () =>
    window.LS_SECURE_MODE ? "no" : "none",
  ),

  selectionenabled: types.optional(types.boolean, true),

  clickablelinks: false,

  highlightcolor: types.maybeNull(customTypes.color),

  showlabels: types.maybeNull(types.boolean),

  encoding: types.optional(types.enumeration(["none", "base64", "base64unicode"]), "none"),

  granularity: types.optional(types.enumeration(["symbol", "word", "sentence", "paragraph"]), "symbol"),
});

const Model = types
  .model("RichTextModel", {
    type: "richtext",
    _value: types.optional(types.maybeNull(types.string), null),
  })
  .views((self) => ({
    get canResizeSpans() {
      return self.type === "text" && !self.isReadOnly();
    },
    get hasStates() {
      const states = self.states();

      return states && states.length > 0;
    },

    states() {
      return self.annotation.toNames.get(self.name);
    },

    activeStates() {
      const states = self.states();

      return states ? states.filter((s) => s.isLabeling && s.isSelected) : null;
    },

    get isLoaded() {
      return self._isLoaded && self._loadedForAnnotation === self.annotation?.id;
    },

    get isReady() {
      return self.isLoaded && self._isReady;
    },

    // we are displaying label for either data-label OR data-index
    get styles() {
      return `
      .htx-highlight {
        cursor: pointer;
        border: 1px dashed transparent;
      }
      .htx-highlight[data-index]::after,
      .htx-highlight[data-label]::after {
        padding: 2px 2px;
        font-size: 9.5px;
        font-weight: bold;
        font-family: var(--font-mono);
        vertical-align: super;
        content: attr(data-label);
        line-height: 0;
      }
      .htx-highlight[data-index]:not([data-label])::after {
        content: attr(data-index);
      }
      .htx-highlight.${STATE_CLASS_MODS.highlighted} {
        position: relative;
        cursor: ${Constants.LINKING_MODE_CURSOR};
        border-color: rgb(0, 174, 255);
      }
      .htx-highlight.${STATE_CLASS_MODS.hidden} {
        border: none;
        padding: 0;
        background: transparent !important;
        cursor: inherit;
        // pointer-events: none;
      }
      .htx-highlight.${STATE_CLASS_MODS.hidden}::before,
      .htx-highlight.${STATE_CLASS_MODS.hidden}::after,
      .htx-highlight.${STATE_CLASS_MODS.noLabel}::after {
        display: none;
      }
      `;
    },
    // This is not a real getter as it is dependant on ref which cannot be cached in the right way
    getIframeBodyNode() {
      const mountNode = self.mountNodeRef.current;
      return mountNode?.contentDocument?.body;
    },
    // This is not a real getter as it is dependant on ref which cannot be cached in the right way
    getRootNode() {
      return self.getIframeBodyNode() ?? self.mountNodeRef.current;
    },
  }))
  .volatile(() => ({
    // the only visible iframe/div, that contains rendered value
    mountNodeRef: createRef(),

    _isReady: false,
    _isLoaded: false,
    _loadedForAnnotation: null,
  }))
  .actions((self) => {
    let domManager;

    return {
      setLoaded(value = true) {
        if (value) self.onLoaded();

        self._isLoaded = value;
        self._loadedForAnnotation = self.annotation?.id;
      },

      onLoaded() {
        if (self.mountNodeRef.current) {
          domManager = new DomManager(self.mountNodeRef.current);
        }
      },

      onDispose() {
        self.regs.forEach((region) => {
          // remove all spans from the visible node, because without cleaning them, the regions won't be updated
          region.clearSpans();
        });
      },

      updateValue: flow(function* (store) {
        const valueFromTask = parseValue(self.value, store.task.dataObj);
        const value = yield self.resolveValue(valueFromTask);

        if (self.valuetype === "url") {
          const url = value;

          if (!isValidObjectURL(url, true)) {
            const message = [WARNING_MESSAGES.badURL(url), WARNING_MESSAGES.dataTypeMistmatch()];

            if (window.LS_SECURE_MODE) message.unshift(WARNING_MESSAGES.secureMode());

            self.annotationStore.addErrors([errorBuilder.generalError(message.join("<br/>\n"))]);
            self.setRemoteValue("");
            return;
          }

          try {
            const response = yield fetch(url);
            const { ok, status, statusText } = response;

            if (!ok) throw new Error(`${status} ${statusText}`);

            self.setRemoteValue(yield response.text());
          } catch (error) {
            const message = messages.ERR_LOADING_HTTP({ attr: self.value, error: String(error), url });

            self.annotationStore.addErrors([errorBuilder.generalError(message)]);
            self.setRemoteValue("");
          }
        } else {
          self.setRemoteValue(value);
        }
      }),

      setRemoteValue(val) {
        self.loaded = true;

        if (self.encoding === "base64") val = atob(val);
        if (self.encoding === "base64unicode") val = Utils.Checkers.atobUnicode(val);

        // clean up the html — remove scripts and iframes
        // nodes count better be the same, so replace them with stubs
        // we should not sanitize text tasks because we already have htmlEscape in view.js
        if (isFF(FF_SAFE_TEXT) && self.type === "text") {
          self._value = String(val);
        } else {
          self._value = sanitizeHtml(String(val));
        }

        self._regionsCache.forEach(({ region, annotation }) => {
          region.setText(self._value.substring(region.startOffset, region.endOffset));
          self.regions.push(region);
          annotation.addRegion(region);
        });

        self._regionsCache = [];
      },

      afterCreate() {
        self._regionsCache = [];

        if (self.type === "text") self.inline = true;

        // security measure, if valuetype is set to url then LS
        // doesn't save the text into the result, otherwise it does
        // can be aslo directly configured
        if (self.savetextresult === "none") {
          if (self.valuetype === "url") self.savetextresult = "no";
          else if (self.valuetype === "text") self.savetextresult = "yes";
        }
      },

      beforeDestroy() {
        domManager?.removeStyles(self.name);
        domManager?.destroy();
        domManager = null;
      },

      needsUpdate() {
        if (self.isLoaded === false) return;

        self.setReady(false);

        const styles = {
          [self.name]: self.styles,
        };

        self.regs.forEach((region) => {
          try {
            // will be initialized only once
            region.initRangeAndOffsets();
            region.applyHighlight(true);
            region.updateHighlightedText();
            styles[region.identifier] = region.styles;
          } catch (err) {
            console.error(err);
          }
        });
        self.setStyles(styles);

        self.setReady(true);
      },

      setStyles(stylesMap) {
        domManager?.setStyles(stylesMap);
      },
      removeStyles(ids) {
        domManager?.removeStyles(ids);
      },

      /**
       * Converts global offsets to relative offsets.
       *
       * @param {Object} start - The start global offset in codepoints.
       * @param {Object} end - The end global offset in codepoints.
       * @returns {undefined|{start: string, startOffset: number, end: string, endOffset: number}} - The relative offsets.
       */
      globalOffsetsToRelativeOffsets({ start, end }) {
        return domManager.globalOffsetsToRelativeOffsets(start, end);
      },

      /**
       * Calculates relative offsets to global offsets for a given range in the document.
       *
       * @param {Node} start - The starting node of the range.
       * @param {number} startOffset - The offset within the starting node.
       * @param {Node} end - The ending node of the range.
       * @param {number} endOffset - The offset within the ending node.
       * @return {number[]|undefined} - An array containing the calculated global offsets in codepoints in the form of [startGlobalOffset, endGlobalOffset].
       */
      relativeOffsetsToGlobalOffsets(start, startOffset, end, endOffset) {
        return domManager.relativeOffsetsToGlobalOffsets(start, startOffset, end, endOffset);
      },

      /**
       * Converts the given range to its global offset.
       *
       * @param {Range} range - The range to convert.
       * @returns {number[]|undefined} - The global offsets of the range in the form of [startGlobalOffset, endGlobalOffset].
       */
      rangeToGlobalOffset(range) {
        return domManager.rangeToGlobalOffset(range);
      },

      /**
       * Creates spans in the DOM for a given range of global offsets.
       *
       * @param {Object} offsets - The start and end offsets of the range.
       * @param {number} offsets.start - The starting offset in codepoints.
       * @param {number} offsets.end - The ending offset in codepoints.
       *
       * @returns {Array} - An array of DOM spans created for the range.
       */
      createSpansByGlobalOffsets({ start, end }) {
        return domManager.createSpans(start, end);
      },

      /**
       * Removes spans from the given array based on the provided start and end global offsets.
       *
       * @param {Array} spans - The array of spans to be modified.
       * @param {Object} offsets - The start and end global offsets.
       * @param {number} offsets.start - The start global offset in codepoints.
       * @param {number} offsets.end - The end global offset in codepoints.
       * @returns {void} - Nothing is returned.
       */
      removeSpansInGlobalOffsets(spans, { start, end }) {
        return domManager?.removeSpans(spans, start, end);
      },

      /**
       * Get text content at the position set by global offsets.
       *
       * @param {Object} offsets - The start and end global offsets.
       * @param {number} offsets.start - The start global offset in codepoints.
       * @param {number} offsets.end - The end global offset in codepoints.
       * @returns {string} - The text content between the start and end offsets.
       */
      getTextFromGlobalOffsets({ start, end }) {
        return domManager.getText(start, end);
      },

      setHighlight(region) {
        self.regs.forEach((r) => r.setHighlight(false));
        if (!region) return;

        if (region.annotation.isLinkingMode) {
          region.setHighlight(true);
        }
      },

      addRegion(range, doubleClickLabel) {
        const states = self.getAvailableStates();

        if (states.length === 0) return;

        const [control, ...rest] = states;
        const values = doubleClickLabel?.value ?? control.selectedValues();
        const labels = { [control.valueType]: values };
        let restSelectedStates;
        if (!ff.isActive(ff.FF_MULTIPLE_LABELS_REGIONS)) {
          // Clone labels nodes to avoid unselecting them on creating result
          restSelectedStates = rest.map((state) => cloneNode(state));
        }

        const area = ff.isActive(ff.FF_MULTIPLE_LABELS_REGIONS)
          ? self.annotation.createResult(range, labels, control, self, false, rest)
          : self.annotation.createResult(range, labels, control, self, false);
        const root = self.getRootNode();

        if (!ff.isActive(ff.FF_MULTIPLE_LABELS_REGIONS)) {
          //when user is using two different labels tag to draw a region, the other labels will be added to the region
          restSelectedStates.forEach((state) => {
            area.setValue(state);
            destroyNode(state);
          });
        }

        area._range = range._range;

        // @TODO: Maybe it could be solved by domManager
        const [soff, eoff] = rangeToGlobalOffset(range._range, root);

        area.updateGlobalOffsets(soff, eoff);

        if (range.isText) {
          area.updateTextOffsets(soff, eoff);
        } else {
          area.updateXPathsFromGlobalOffsets();
        }

        area.applyHighlight();

        area.notifyDrawingFinished();

        return area;
      },
    };
  });

export const RichTextModel = types.compose(
  "RichTextModel",
  ProcessAttrsMixin,
  ObjectBase,
  RegionsMixin,
  AnnotationMixin,
  IsReadyMixin,
  TagAttrs,
  Model,
);
