import { destroy as destroyNode, flow, types } from 'mobx-state-tree';
import { createRef } from 'react';
import { customTypes } from '../../../core/CustomTypes';
import { errorBuilder } from '../../../core/DataValidator/ConfigValidator';
import { AnnotationMixin } from '../../../mixins/AnnotationMixin';
import IsReadyMixin from '../../../mixins/IsReadyMixin';
import ProcessAttrsMixin from '../../../mixins/ProcessAttrs';
import RegionsMixin from '../../../mixins/Regions';
import Utils from '../../../utils';
import { parseValue } from '../../../utils/data';
import { sanitizeHtml } from '../../../utils/html';
import messages from '../../../utils/messages';
import { findRangeNative, rangeToGlobalOffset } from '../../../utils/selection-tools';
import { escapeHtml, isValidObjectURL } from '../../../utils/utilities';
import ObjectBase from '../Base';
import { cloneNode } from '../../../core/Helpers';
import { FF_LSDV_4620_3, FF_SAFE_TEXT, isFF } from '../../../utils/feature-flags';
import DomManager from './domManager';
import { STATE_CLASS_MODS } from '../../../mixins/HighlightMixin';
import Constants from '../../../core/Constants';

const WARNING_MESSAGES = {
  dataTypeMistmatch: () => 'Do not put text directly in task data if you use valueType=url.',
  badURL: url => `URL (${escapeHtml(url)}) is not valid.`,
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
const TagAttrs = types.model('RichTextModel', {
  value: types.maybeNull(types.string),

  /** Defines the type of data to be shown */
  valuetype: types.optional(types.enumeration(['text', 'url']), () => (window.LS_SECURE_MODE ? 'url' : 'text')),

  inline: false,

  /** Whether or not to save selected text to the serialized data */
  savetextresult: types.optional(types.enumeration(['none', 'no', 'yes']), () =>
    window.LS_SECURE_MODE ? 'no' : 'none',
  ),

  selectionenabled: types.optional(types.boolean, true),

  clickablelinks: false,

  highlightcolor: types.maybeNull(customTypes.color),

  showlabels: types.maybeNull(types.boolean),

  encoding: types.optional(types.enumeration(['none', 'base64', 'base64unicode']), 'none'),

  granularity: types.optional(types.enumeration(['symbol', 'word', 'sentence', 'paragraph']), 'symbol'),
});

const Model = types
  .model('RichTextModel', {
    type: 'richtext',
    _value: types.optional(types.string, ''),
  })
  .views(self => ({
    get hasStates() {
      const states = self.states();

      return states && states.length > 0;
    },

    states() {
      return self.annotation.toNames.get(self.name);
    },

    activeStates() {
      const states = self.states();

      return states ? states.filter(s => s.isLabeling && s.isSelected) : null;
    },

    get isLoaded() {
      return self._isLoaded && self._loadedForAnnotation === self.annotation?.id;
    },

    get isReady() {
      return self.isLoaded && self._isReady;
    },

    get styles() {
      return `
      .htx-highlight {
        cursor: pointer;
        border: 1px dashed transparent;
      }
      .htx-highlight[data-label]::after {
        padding: 2px 2px;
        font-size: 9.5px;
        font-weight: bold;
        font-family: Monaco;
        vertical-align: super;
        content: attr(data-label);
        line-height: 0;
      }
      .htx-highlight.${STATE_CLASS_MODS.highlighted} {
        position: relative;
        cursor: ${Constants.RELATION_MODE_CURSOR};
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
  }))
  .volatile(() => ({
    // the only visible iframe/div
    visibleNodeRef: createRef(),
    // regions highlighting is much faster in a hidden iframe/div; applyHighlights() works here
    workingNodeRef: createRef(),
    // xpaths should be calculated over original document without regions' spans
    originalContentRef: createRef(),
    // toggle showing which node to modify — visible or working
    useWorkingNode: false,

    _isReady: false,

    regsObserverDisposer: null,
    _isLoaded: false,
    _loadedForAnnotation: null,
  }))
  .actions(self => {
    let beforeNeedsUpdateCallback, afterNeedsUpdateCallback, domManager;

    return {
      setWorkingMode(mode) {
        self.useWorkingNode = mode;
      },

      setLoaded(value = true) {
        if (value) self.onLoaded();

        self._isLoaded = value;
        self._loadedForAnnotation = self.annotation?.id;
      },

      onLoaded() {
        if (self.visibleNodeRef.current && isFF(FF_LSDV_4620_3)) {
          domManager = new DomManager(self.visibleNodeRef.current);
        }
      },

      updateValue: flow(function * (store) {
        const valueFromTask = parseValue(self.value, store.task.dataObj);
        const value = yield self.resolveValue(valueFromTask);

        if (self.valuetype === 'url') {
          const url = value;

          if (!isValidObjectURL(url, true)) {
            const message = [WARNING_MESSAGES.badURL(url), WARNING_MESSAGES.dataTypeMistmatch()];

            if (window.LS_SECURE_MODE) message.unshift(WARNING_MESSAGES.secureMode());

            self.annotationStore.addErrors([errorBuilder.generalError(message.join('<br/>\n'))]);
            self.setRemoteValue('');
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
            self.setRemoteValue('');
          }
        } else {
          self.setRemoteValue(value);
        }
      }),

      setRemoteValue(val) {
        self.loaded = true;

        if (self.encoding === 'base64') val = atob(val);
        if (self.encoding === 'base64unicode') val = Utils.Checkers.atobUnicode(val);

        // clean up the html — remove scripts and iframes
        // nodes count better be the same, so replace them with stubs
        // we should not sanitize text tasks because we already have htmlEscape in view.js
        if (isFF(FF_SAFE_TEXT) && self.type === 'text') {
          self._value = val;
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

        if (self.type === 'text') self.inline = true;

        // security measure, if valuetype is set to url then LS
        // doesn't save the text into the result, otherwise it does
        // can be aslo directly configured
        if (self.savetextresult === 'none') {
          if (self.valuetype === 'url') self.savetextresult = 'no';
          else if (self.valuetype === 'text') self.savetextresult = 'yes';
        }
      },

      beforeDestroy() {
        self.regsObserverDisposer?.();
        if (isFF(FF_LSDV_4620_3)) {
          domManager?.removeStyles(self.name);
          domManager?.destroy();
          beforeNeedsUpdateCallback = null;
          afterNeedsUpdateCallback = null;
          domManager = null;
        }
      },

      // callbacks to switch render to working node for better performance
      setNeedsUpdateCallbacks(beforeCalback, afterCalback) {
        beforeNeedsUpdateCallback = beforeCalback;
        afterNeedsUpdateCallback = afterCalback;
      },

      needsUpdate() {
        if (self.isLoaded === false) return;

        self.setReady(false);

        if (isFF(FF_LSDV_4620_3)) {
          const styles = {
            [self.name]: self.styles,
          };

          self.regs.forEach(region => {
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
        } else {
          // init and render regions into working node, then move them to visible one
          beforeNeedsUpdateCallback?.();
          self.regs.forEach(region => {
            try {
              // will be initialized only once
              region.initRangeAndOffsets();
              region.applyHighlight();
            } catch (err) {
              console.error(err);
            }
          });
          afterNeedsUpdateCallback?.();

          // node texts can be only retrieved from the visible node
          self.regs.forEach(region => {
            try {
              region.updateHighlightedText();
            } catch (err) {
              console.error(err);
            }
          });
        }

        self.setReady(true);
      },

      setStyles(stylesMap) {
        domManager.setStyles(stylesMap);
      },
      removeStyles(ids) {
        domManager?.removeStyles(ids);
      },

      globalOffsetsToRelativeOffsets({ start, end }) {
        return domManager.globalOffsetsToRelativeOffsets(start, end);
      },

      relativeOffsetsToGlobalOffsets(start, startOffset, end, endOffset) {
        return domManager.relativeOffsetsToGlobalOffsets(start, startOffset, end, endOffset);
      },

      rangeToGlobalOffset(range) {
        return domManager.rangeToGlobalOffset(range);
      },

      createRangeByGlobalOffsets({ start, end }) {
        return domManager.createRange(start, end);
      },

      createSpansByGlobalOffsets({ start, end }) {
        return domManager.createSpans(start, end);
      },

      removeSpansInGlobalOffsets(spans, { start, end }) {
        return domManager?.removeSpans(spans, start, end);
      },

      getTextFromGlobalOffsets({ start, end }) {
        return domManager.getText(start, end);
      },

      setHighlight(region) {
        self.regs.forEach(r => r.setHighlight(false));
        if (!region) return;

        if (region.annotation.relationMode) {
          region.setHighlight(true);
        }
      },

      addRegion(range, doubleClickLabel) {
        const states = self.getAvailableStates();

        if (states.length === 0) return;

        const [control, ...rest] = states;
        const values = doubleClickLabel?.value ?? control.selectedValues();
        const labels = { [control.valueType]: values };
        // Clone labels nodes to avoid unselecting them on creating result
        const restSelectedStates = rest.map(state => cloneNode(state));

        const area = self.annotation.createResult(range, labels, control, self);
        const rootEl = self.visibleNodeRef.current;
        const root = rootEl?.contentDocument?.body ?? rootEl;

        //when user is using two different labels tag to draw a region, the other labels will be added to the region
        restSelectedStates.forEach(state => {
          area.setValue(state);
          destroyNode(state);
        });

        area._range = range._range;

        const [soff, eoff] = rangeToGlobalOffset(range._range, root);

        area.updateGlobalOffsets(soff, eoff);

        if (range.isText) {
          area.updateTextOffsets(soff, eoff);
        } else {
          if (isFF(FF_LSDV_4620_3)) {
            area.updateXPathsFromGlobalOffsets();
          } else {
            // reapply globalOffsets to original document to get correct xpaths and offsets
            const original = area._getRootNode(true);
            const originalRange = findRangeNative(soff, eoff, original);

            // @todo if originalRange is missed we are really fucked up
            if (originalRange) area._fixXPaths(originalRange, original);
          }
        }

        area.applyHighlight();

        area.notifyDrawingFinished();

        return area;
      },
    };
  });

export const RichTextModel = types.compose('RichTextModel', ProcessAttrsMixin, ObjectBase, RegionsMixin, AnnotationMixin, IsReadyMixin, TagAttrs, Model);
