import { LoadingOutlined } from "@ant-design/icons";
import * as ff from "@humansignal/core/lib/utils/feature-flags/ff";
import { observe } from "mobx";
import { inject, observer } from "mobx-react";
import { isAlive } from "mobx-state-tree";
import React, { Component } from "react";
import * as xpath from "xpath-range";

import ObjectTag from "../../../components/Tags/Object";
import { STATE_CLASS_MODS } from "../../../mixins/HighlightMixin";
import Utils from "../../../utils";
import { cn } from "../../../utils/bem";
import { htmlEscape, matchesSelector } from "../../../utils/html";
import {
  applyTextGranularity,
  fixCodePointsInRange,
  fixRange,
  rangeToGlobalOffset,
  trimSelection,
} from "../../../utils/selection-tools";
import { isDefined } from "../../../utils/utilities";
import "./RichText.scss";

const DBLCLICK_TIMEOUT = 450; // ms
const DBLCLICK_RANGE = 5; // px

class RichTextPieceView extends Component {
  _regionSpanSelector = ".htx-highlight";
  _regionVisibleSpanSelector = ".htx-highlight:not(.__hidden)";

  loadingRef = React.createRef();

  // store value of first selected label during double click to apply it later
  doubleClickSelection;

  _selectRegions = (additionalMode) => {
    const { item } = this.props;
    const root = item.mountNodeRef.current;
    const selection = window.getSelection();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    const regions = [];

    while (walker.nextNode()) {
      const node = walker.currentNode;

      if (node.nodeName === "SPAN" && node.matches(this._regionVisibleSpanSelector) && selection.containsNode(node)) {
        const region = this._determineRegion(node);

        regions.push(region);
      }
    }
    if (regions.length) {
      item.annotation.extendSelectionWith(regions);
      if (additionalMode) {
        item.annotation.extendSelectionWith(regions);
      } else {
        item.annotation.selectAreas(regions);
      }
      selection.removeAllRanges();
    }
  };

  /****** DRAG-N-DROP EDIT METHODS ******/
  /******
   * The main idea is to use browser selection with styles of the region so the region expansion will look
   * smooth and natural. At the beginning the selection will be set to wrap the region. So users will just change
   * the selection during drag-n-drop, no extra code required for the visual part.
   *
   * Steps to achieve this:
   * 1. Detect that user is about to resize the region (mousedown on a handle)
   * 2. Set selection style to the region's style
   * 3. Set selection range to the region's range for the initial state
   * 4. We do nothing on mousemove, and on mouseup we update the region's offsets
   * 5. Remove selection style
   *
   * There are some tricky parts here: selection should be created after we started dragging,
   * if we create it before, then the drag will drag-n-drop the selection instead of continuing it.
   * Steps and flags on init:
   * - mousedown: check if we are on a handle, set `draggableRegion` and `dragBackwards` to understand the direction
   * - mousemove: if we have `draggableRegion` but don't have `initializedDrag`, set it; that means we are dragging
   * - mousemove: if we have both, create selection around the region, set `currentSelection`;
   *              we are editing the region now
   * And we should reset all of them on mouseup.
   **/

  /**
   * Adjust selection style to mimic region's style but with a lighter color; this is done by creating a style tag.
   * Region style is also adjusted to be lighter so the combination of two will look like original selected region.
   * Also sets cursor to "resize" for all document during resize.
   * @param {*} region to mimic
   * @param {Document} doc document to apply style to
   */
  _setSelectionStyle = (region, doc) => {
    const colors = region.getColors();
    const rules = [`background: ${colors.resizeBackground};`, `color: ${colors.activeText};`];

    if (!this.selectionStyle) {
      this.selectionStyle = doc.createElement("style");
      // style tag in body changes its inner text, so only head!
      doc.head.appendChild(this.selectionStyle);
    }

    this.selectionStyle.innerText = [
      `::selection {${rules.join(" ")}}`, // set selection style to mimic region
      `::-moz-selection {${rules.join(" ")}}`, // the same for Firefox
      "body * { cursor: col-resize !important; }", // set cursor for all elements
    ].join("\n");
    this.props.item.setStyles?.({ [region.identifier]: region.resizeStyles });
  };

  /**
   * Reset selection style and region style to default
   */
  _removeSelectionStyle = (region) => {
    if (this.selectionStyle) this.selectionStyle.innerText = "";
    if (region) this.props.item.setStyles?.({ [region.identifier]: region.styles });
  };

  /**
   * When we finished region adjustment, or if we just clicked somewhere, we should reset all the flags
   */
  _resetDragParams() {
    const { item } = this.props;

    item.initializedDrag = false;
    this.draggableRegion = undefined;
    this.currentSelection = undefined;
    this.dragBackwards = false;
  }

  /**
   * Check if the target is a handle and prepare dragging if it is. Set the `draggableRegion` to mark this.
   * @param {Event} ev Mouse down event
   */
  _checkHandlesAndStartDragging = (ev) => {
    const { item } = this.props;
    const target = ev.target;
    const region = this._determineRegion(target);
    const classes = [STATE_CLASS_MODS.leftHandle, STATE_CLASS_MODS.rightHandle];
    const isHandle = target.classList.contains(classes[0]) || target.classList.contains(classes[1]);

    if (ev.buttons === 1 && region?.selected && isHandle) {
      const tag = item.mountNodeRef.current;
      const doc = tag?.contentDocument ?? tag?.ownerDocument ?? tag;

      this.draggableRegion = region;
      // @todo that was a very good idea, but we don't need it right now, maybe later
      // this.dragAnchor = doc.caretRangeFromPoint(ev.clientX, ev.clientY);
      this.dragBackwards = target.classList.contains(classes[0]);

      this._setSelectionStyle(region, doc);
    } else {
      this.draggableRegion = undefined;
    }
  };

  /**
   * Apply browser selection around the region. Selection anchor should respect the direction of the drag.
   * @param {Document} _doc is not used in this implementation
   * @param {HTMLElement} region to wrap selection around
   */
  _hightlightRegion = (_doc, region) => {
    const span = region._spans[0];
    const lastSpan = region._spans.at(-1);
    const selection = window.getSelection();

    if (this.dragBackwards) {
      selection.selectAllChildren(lastSpan);
      selection.collapseToEnd();
      selection.extend(span, 0);
    } else {
      selection.selectAllChildren(span);
      selection.extend(lastSpan, lastSpan.childNodes.length - 1);
    }
  };

  /**
   * Check if the drag is finished and apply the new offsets to the region.
   * If we just clicked somewhere or we were not resizing the region, we should
   * just reset all the flags and remove the selection style.
   * @param {HTMLElement} root
   * @returns {boolean} true if we adjusted the region, false otherwise
   */
  _checkDragAndAdjustRegion = (root) => {
    const { item } = this.props;

    // always reset the styles, so we won't stuck with unexpected colors
    this._removeSelectionStyle(this.draggableRegion);

    if (item.initializedDrag) {
      const area = this.draggableRegion;
      const selection = window.getSelection();

      // don't collapse region into nothing
      if (selection.isCollapsed) return false;
      if (!area) return false;

      let range = fixRange(selection.getRangeAt(0));

      // @todo would be more convenient to try to reduce the range to be within the root,
      // @todo so for example if we drag to the left and the range is outside of the root, we would
      // @todo just reduce it to the left edge of the root,
      // @todo but that would be a bit more complicated, so let's just check if the range is within the root for now.
      if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
        selection.removeAllRanges();
        return false;
      }

      // remove handles to not mess with ranges and selection
      area.detachHandles();

      // we need this to properly apply the granularity; it fixes selection to point only to text nodes
      if (item.granularity !== "symbol") {
        trimSelection(selection);
      }

      // update range to respect granularity
      applyTextGranularity(selection, item.granularity);
      range = selection.getRangeAt(0);

      // so no visual glitches on the screen, selection was just a helper here, we don't need it anymore
      selection.removeAllRanges();

      area._range = range;

      // we have to calculate offsets before we remove spans, because it will break the range
      const [soff, eoff] = rangeToGlobalOffset(range, root);

      // remove all spans to recreate them later
      area.removeHighlight();

      // we update multiple props of the region here, so easier to just freeze the history during these updates
      item.annotation.history.freeze("richtext:resize");

      area.updateGlobalOffsets(soff, eoff);
      if (item.type === "text") {
        area.updateTextOffsets(soff, eoff);
      } else {
        // @todo right now resizing works only for text regions, this `else` branch is for the future
        area.updateXPathsFromGlobalOffsets();
      }

      // recreating spans + attach handles because region stays selected
      area.applyHighlight();
      area.attachHandles();

      area.notifyDrawingFinished();
      area.updateHighlightedText({ force: true });

      item.annotation.history.unfreeze("richtext:resize");

      return true;
    }

    return false;
  };

  _onMouseDown = (ev) => {
    if (this.props.item.canResizeSpans) {
      // we definitelly not in a process of adjusting any other region anymore, so reset flags
      this._resetDragParams();
      this._removeSelectionStyle();
      // but might start to adjust this one
      this._checkHandlesAndStartDragging(ev);
    }
  };

  _onMouseMove = (ev) => {
    if (this.draggableRegion) {
      ev.preventDefault();

      const { item } = this.props;

      if (!item.initializedDrag) {
        item.initializedDrag = true;
      } else if (!this.currentSelection) {
        const tag = item.mountNodeRef.current;
        const doc = tag?.contentDocument ?? tag?.ownerDocument ?? tag;
        this.currentSelection = window.getSelection();
        this._hightlightRegion(doc, this.draggableRegion);
        // attach global event for mouseup to always catch the end of dragging, even outside of the tag;
        // will be called after mouseup on the text tag
        document.addEventListener("mouseup", this._onMouseUpGlobal, { once: true });
      }
    }
  };

  _onMouseUpGlobal = () => {
    const { item } = this.props;
    const rootEl = item.mountNodeRef.current;
    const root = rootEl?.contentDocument?.body ?? rootEl;

    this._checkDragAndAdjustRegion(root);

    if (this.draggableRegion) {
      this._resetDragParams();
    }
  };

  _onMouseUp = (ev) => {
    const { item } = this.props;

    // if we are adjusting the region, we should not create a new one
    if (item.initializedDrag) return;

    const states = item.activeStates();
    const rootEl = item.mountNodeRef.current;
    const root = rootEl?.contentDocument?.body ?? rootEl;

    if (!states || states.length === 0 || ev.ctrlKey || ev.metaKey)
      return this._selectRegions(ev.ctrlKey || ev.metaKey);
    if (item.selectionenabled === false || item.annotation.isReadOnly()) return;
    const label = states[0]?.selectedLabels?.[0];
    const value = states[0]?.selectedValues?.();

    Utils.Selection.captureSelection(
      ({ selectionText, range }) => {
        if (!range || range.collapsed || !root.contains(range.startContainer) || !root.contains(range.endContainer)) {
          return;
        }

        fixCodePointsInRange(range);

        const normedRange = xpath.fromRange(range, root);

        if (!normedRange) return;

        if (
          this.doubleClickSelection &&
          (Date.now() - this.doubleClickSelection.time > DBLCLICK_TIMEOUT ||
            Math.abs(ev.pageX - this.doubleClickSelection.x) > DBLCLICK_RANGE ||
            Math.abs(ev.pageY - this.doubleClickSelection.y) > DBLCLICK_RANGE)
        ) {
          this.doubleClickSelection = undefined;
        }

        normedRange._range = range;
        normedRange.text = selectionText;
        normedRange.isText = item.type === "text";
        item.addRegion(normedRange, this.doubleClickSelection);
      },
      {
        window: rootEl?.contentWindow ?? window,
        granularity: label?.granularity ?? item.granularity,
        beforeCleanup: () => {
          this.doubleClickSelection = undefined;
          this._selectionMode = true;
        },
      },
    );
    this.doubleClickSelection = {
      time: Date.now(),
      value: value?.length ? value : undefined,
      x: ev.pageX,
      y: ev.pageY,
    };
  };

  /**
   * @param {MouseEvent} event
   */
  _onRegionClick = (event) => {
    if (this._selectionMode) {
      this._selectionMode = false;
      return;
    }
    if (!this.props.item.clickablelinks && matchesSelector(event.target, "a[href]")) {
      event.preventDefault();
      return;
    }

    const region = this._determineRegion(event.target);

    if (!region) return;
    region && region.onClickRegion(event);
    event.stopPropagation();
  };

  /**
   * @param {MouseEvent} event
   */
  _onRegionMouseOver = (event) => {
    const region = this._determineRegion(event.target);
    const { item } = this.props;

    item.setHighlight(region);
  };

  /**
   * Handle initial rendering and all subsequent updates
   */
  _handleUpdate(initial = false) {
    const { item } = this.props;
    const root = item.getRootNode();

    if (!item.inline) {
      // @TODO: How did we plan to get root.tagName === "IFRAME" here?
      if (!root || root.tagName === "IFRAME" || !root.childNodes.length || item.isLoaded === false) return;
    }

    // Apply highlight to ranges of a current tag
    // Also init regions' offsets and html range on initial load

    if (initial && item.annotation) {
      const { history, pauseAutosave, startAutosave } = item.annotation;

      pauseAutosave();
      history.freeze("richtext:init");
      item.needsUpdate();
      history.setReplaceNextUndoState(true);
      history.unfreeze("richtext:init");
      startAutosave();
    } else {
      item.needsUpdate();
    }
  }

  /**
   * Detects a RichTextRegion corresponding to a span
   * @param {HTMLElement} element
   */
  _determineRegion(element) {
    const spanSelector = this._regionVisibleSpanSelector;

    if (matchesSelector(element, spanSelector)) {
      const span =
        element.tagName === "SPAN" && element.matches(spanSelector) ? element : element.closest(spanSelector);
      const { item } = this.props;

      return item.regs.find((region) => region.find(span));
    }
  }

  componentDidMount() {
    const { item } = this.props;

    if (!item.inline) {
      this.dispose = observe(item, "_isReady", this.updateLoadingVisibility, true);
    }
  }

  componentWillUnmount() {
    const { item } = this.props;

    if (!item || !isAlive(item)) return;

    this.dispose?.();
    item.setLoaded(false);
    item.setReady(false);
    item.onDispose();
  }

  markObjectAsLoaded() {
    const { item } = this.props;

    if (!item || !isAlive(item)) return;

    item.setLoaded(true);
    this.updateLoadingVisibility();

    // run in the next tick to have all the refs initialized
    setTimeout(() => this._handleUpdate(true));
  }

  // no isReady observing in render
  updateLoadingVisibility = () => {
    const { item } = this.props;
    const loadingEl = this.loadingRef.current;

    if (!loadingEl) return;
    if (item && isAlive(item) && item.isLoaded && item.isReady) {
      loadingEl.setAttribute("style", "display: none");
    } else {
      loadingEl.removeAttribute("style");
    }
  };

  _passHotkeys = (e) => {
    const props = "key code keyCode location ctrlKey shiftKey altKey metaKey".split(" ");
    const init = {};

    for (const prop of props) init[prop] = e[prop];

    const internal = new KeyboardEvent(e.type, init);

    document.dispatchEvent(internal);
  };

  onIFrameLoad = () => {
    const { item } = this.props;
    const iframe = item.mountNodeRef.current;
    const doc = iframe?.contentDocument;
    const body = doc?.body;
    const htmlEl = body?.parentElement;
    const eventHandlers = {
      click: [this._onRegionClick, true],
      keydown: [this._passHotkeys, false],
      keyup: [this._passHotkeys, false],
      keypress: [this._passHotkeys, false],
      mouseup: [this._onMouseUp, false],
      mouseover: [this._onRegionMouseOver, true],
    };

    if (!body) return;

    for (const event in eventHandlers) {
      body.addEventListener(event, ...eventHandlers[event]);
    }

    // @todo remove this, project-specific
    // fix unselectable links
    const style = doc.createElement("style");

    style.textContent = "body a[href] { pointer-events: all; }";
    doc.head.appendChild(style);

    // // @todo make links selectable; dragstart supressing doesn't help — they are still draggable
    // body.addEventListener("dragstart", e => {
    //   e.stopPropagation();
    //   e.preventDefault();
    // });

    // auto-height
    if (body.scrollHeight) {
      // body dimensions sometimes doesn't count some inner content offsets
      // but html's offsetHeight sometimes is zero, so get the max of both
      iframe.style.height = `${Math.max(body.scrollHeight, htmlEl.offsetHeight)}px`;
    }

    this.markObjectAsLoaded();
  };

  render() {
    const { item } = this.props;

    if (!isDefined(item._value)) return null;

    let val = item._value || "";
    const newLineReplacement = "<br/>";
    const settings = this.props.store.settings;
    const isText = item.type === "text";

    if (isText) {
      const cnLine = cn("richtext", { elem: "line" });

      val = htmlEscape(val)
        .split(/\n|\r/g)
        .map((s) => `<span class="${cnLine}">${s}</span>`)
        .join(newLineReplacement);
    }

    if (item.inline) {
      const eventHandlers = {
        onClickCapture: this._onRegionClick,
        onMouseDown: this._onMouseDown,
        onMouseMove: this._onMouseMove,
        onMouseUp: this._onMouseUp,
        onMouseOverCapture: this._onRegionMouseOver,
      };

      return (
        <ObjectTag item={item} className={cn("richtext").toClassName()}>
          <div
            key="root"
            className={cn("richtext")
              .elem("container")
              .mod({ canResizeSpans: ff.isActive(ff.FF_ADJUSTABLE_SPANS) })
              .mix("htx-richtext")
              .toClassName()}
            ref={(el) => {
              item.mountNodeRef.current = el;
              el && this.markObjectAsLoaded();
            }}
            data-linenumbers={isText && settings.showLineNumbers ? "enabled" : "disabled"}
            dangerouslySetInnerHTML={{ __html: val }}
            {...eventHandlers}
          />
        </ObjectTag>
      );
    }
    return (
      <ObjectTag item={item} className={cn("richtext").toClassName()}>
        <div className={cn("richtext").elem("loading").toClassName()} ref={this.loadingRef}>
          <LoadingOutlined />
        </div>
        {/* biome-ignore lint/a11y/useIframeTitle: As a result from BEM migration */}
        <iframe
          key="root"
          className={cn("richtext").elem("iframe").mix("htx-richtext").toClassName()}
          referrerPolicy="no-referrer"
          sandbox="allow-same-origin allow-scripts allow-presentation"
          ref={(el) => {
            item.setReady(false);
            item.mountNodeRef.current = el;
          }}
          srcDoc={val}
          onLoad={this.onIFrameLoad}
        />
      </ObjectTag>
    );
  }
}

const storeInjector = inject("store");

const RPTV = storeInjector(observer(RichTextPieceView));

export const HtxRichText = ({ isText = false } = {}) => {
  return storeInjector(
    observer((props) => {
      return <RPTV {...props} isText={isText} />;
    }),
  );
};
