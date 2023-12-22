import { getRoot, types } from 'mobx-state-tree';

import Utils from '../utils';
import Constants, { defaultStyle } from '../core/Constants';
import { highlightRange } from '../utils/html';

export default types
  .model()
  .views(() => ({}))
  .actions(self => ({
    updateSpansColor(bgcolor, opacity) {
      if (self._spans) {
        self._spans.forEach(span => {
          if (bgcolor) {
            span.style.backgroundColor = bgcolor;
          }

          if (opacity) {
            span.style.backgroundColor = Utils.Colors.rgbaChangeAlpha(span.style.backgroundColor, opacity);
          }
        });
      }
    },

    updateAppearenceFromState() {
      const labelColor = self.getLabelColor();

      self.updateSpansColor(labelColor, self.selected ? 0.8 : 0.3);
      self.applyCSSClass(self._lastSpan);
    },

    createSpans() {
      const labelColor = self.getLabelColor();
      const spans = highlightRange(self, 'htx-highlight', { backgroundColor: labelColor });

      const lastSpan = spans[spans.length - 1];

      if (!lastSpan) return;

      self.applyCSSClass(lastSpan);

      self._lastSpan = lastSpan;
      self._spans = spans;

      return spans;
    },

    getLabelColor() {
      let labelColor = self.parent.highlightcolor || (self.style || self.tag || defaultStyle).fillcolor;

      if (labelColor) {
        labelColor = Utils.Colors.convertToRGBA(labelColor, 0.3);
      }

      return labelColor;
    },

    applyCSSClass(lastSpan) {
      if (!lastSpan) return;
      const classes = ['htx-highlight', 'htx-highlight-last'];
      const settings = getRoot(self).settings;

      if (!self.parent.showlabels && !settings.showLabels) {
        classes.push('htx-no-label');
      } else {
        // @todo multilabeling with different labels?
        const names = self.labeling?.mainValue;
        const cssCls = Utils.HTML.labelWithCSS(lastSpan, {
          labels: names,
          score: self.score,
        });

        classes.push(cssCls);
      }
      lastSpan.className = classes.filter(Boolean).join(' ');
    },

    addEventsToSpans(spans) {
      const addEvent = s => {
        s.onmouseover = function(ev) {
          if (self.hidden) return;
          if (self.annotation.relationMode) {
            self.toggleHighlight();
            s.style.cursor = Constants.RELATION_MODE_CURSOR;
            // only one span should be highlighted
            ev.stopPropagation();
          } else {
            s.style.cursor = Constants.POINTER_CURSOR;
          }
        };

        s.onmouseout = function() {
          if (self.hidden) return;
          self.setHighlight(false);
        };

        s.onmousedown = function(ev) {
          if (self.hidden) return;
          // if we click to already selected span (=== this)
          // skip it to allow another span to be selected
          if (self.parent._currentSpan !== this) {
            ev.stopPropagation();
            self.parent._currentSpan = this;
          }
        };

        s.onclick = function() {
          if (self.hidden) return;
          // set above in `onmousedown`, can be nulled when new region created
          if (self.parent._currentSpan !== this) return;
          // reset for the case we just created new relation
          s.style.cursor = Constants.POINTER_CURSOR;
          self.onClickRegion();
        };

        return false;
      };

      spans && spans.forEach(s => addEvent(s));
    },

    selectRegion() {
      self.updateSpansColor(null, 0.8);

      const first = self._spans[0];

      if (first) {
        if (first.scrollIntoViewIfNeeded) {
          first.scrollIntoViewIfNeeded();
        } else {
          first.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
    },

    /**
     * Unselect text region
     */
    afterUnselectRegion() {
      self.updateSpansColor(null, 0.3);
    },

    setHighlight(val) {
      self._highlighted = val;

      if (self._spans) {
        const len = self._spans.length;
        const fspan = self._spans[0];
        const lspan = self._spans[len - 1];
        const mspans = self._spans.slice(1, len - 1);

        const set = (span, s, { top = true, bottom = true, right = true, left = true } = {}) => {
          if (right) span.style.borderRight = s;
          if (left) span.style.borderLeft = s;
          if (top) span.style.borderTop = s;
          if (bottom) span.style.borderBottom = s;
        };

        if (self.highlighted && !self.hidden) {
          const h = Constants.HIGHLIGHTED_CSS_BORDER;

          set(fspan, h, { right: false });
          set(lspan, h, { left: false });

          if (mspans.length) mspans.forEach(s => set(s, h, { left: false, right: false }));
        } else {
          const zpx = '0px';

          set(fspan, zpx);
          set(lspan, zpx);

          if (mspans.length) mspans.forEach(s => set(s, zpx, { left: false, right: false }));
        }
      }
    },

    toggleHidden(e) {
      self.hidden = !self.hidden;
      self.setHighlight(self.highlighted);

      if (self.hidden) {
        self.updateSpansColor('transparent', 0);
        if (self._spans) {
          self._spans.forEach(span => {
            span.style.cursor = Constants.DEFAULT_CURSOR;
          });
        }
      } else {
        self.updateAppearenceFromState();
      }
      e?.stopPropagation();
    },

    find(span) {
      return self._spans && self._spans.indexOf(span) >= 0 ? self : undefined;
    },

  }));
