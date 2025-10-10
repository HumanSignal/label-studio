import React, { Component, useCallback } from "react";
import { inject, observer } from "mobx-react";

import ObjectTag from "../../../components/Tags/Object";
import { FF_DEV_2669, FF_DEV_2918, FF_LSDV_E_278, FF_NER_SELECT_ALL, isFF } from "../../../utils/feature-flags";
import { findNodeAt, matchesSelector, splitBoundaries } from "../../../utils/html";
import { patchPlayPauseMethods } from "../../../utils/patchPlayPauseMethods";
import { isSelectionContainsSpan } from "../../../utils/selection-tools";
import { useUpdateBuffering } from "../../../hooks/useUpdateBuffering";
import styles from "./Paragraphs.module.scss";
import { AuthorFilter } from "./AuthorFilter";
import { Phrases } from "./Phrases";
import { IconHelp } from "@humansignal/icons";
import { Toggle, Tooltip } from "@humansignal/ui";
import { cn } from "../../../utils/bem";
import { cnm } from "@humansignal/shad/utils";
import { ff } from "@humansignal/core";
import { useHotkey } from "../../../hooks/useHotkey";

const audioDefaultProps = { crossOrigin: "anonymous" };
const isSyncedBuffering = ff.isActive(ff.FF_SYNCED_BUFFERING);

// Separate functional component to handle hotkeys
const ParagraphHotkeys = ({ item }) => {
  if (!isFF(FF_NER_SELECT_ALL)) return null;

  useHotkey("phrases:next-phrase", () => {
    item._viewRef?.handleNextPhrase();
  });
  useHotkey("phrases:previous-phrase", () => {
    item._viewRef?.handlePreviousPhrase();
  });
  useHotkey("phrases:select_all_annotate", () => {
    item.selectAllAndAnnotateCurrentPhrase();
  });
  useHotkey("phrases:next-region", () => {
    item._viewRef?.handleNextRegion();
  });
  useHotkey("phrases:previous-region", () => {
    item._viewRef?.handlePreviousRegion();
  });

  return null; // This component renders nothing
};

const ParagraphAudio = observer(({ item }) => {
  const isBuffering = isSyncedBuffering && item.isBuffering;

  const updateBuffering = useUpdateBuffering(item.audioRef, item.handleBuffering);

  const attachRef = useCallback(
    (audio) => {
      if (audio) {
        audio = patchPlayPauseMethods(audio);
      }
      if (item.audioRef instanceof Function) {
        item.audioRef(audio);
      } else if (item.audioRef) {
        item.audioRef.current = audio;
      }
    },
    [item],
  );

  return (
    <>
      {isBuffering && <div className="lsf-timeline-controls__buffering" aria-label="Buffering Media Source" />}
      <audio
        {...audioDefaultProps}
        controls={item.showplayer && !item.syncedAudio}
        className={styles.audio}
        src={item.audio}
        ref={attachRef}
        onLoadedMetadata={item.handleAudioLoaded}
        onEnded={item.reset}
        onError={item.handleError}
        {...(isSyncedBuffering
          ? {
              onCanPlay: updateBuffering,
              onWaiting: updateBuffering,
            }
          : {})}
      />
    </>
  );
});

class HtxParagraphsView extends Component {
  // Constants for scroll behavior
  static SCROLL_FLAG_TIMEOUT = 100;

  _regionSpanSelector = ".htx-highlight";
  mainContentSelector = `.${cn("main-content").toClassName()}`;
  mainViewAnnotationSelector = `.${cn("main-view").elem("annotation").toClassName()}`;

  constructor(props) {
    super(props);
    this.myRef = React.createRef();
    this.activeRef = React.createRef();
    this.lastPlayingId = -1;
    this.scrollTimeout = [];
    this.isPlaying = false;
    this.isProgrammaticScroll = false;
    this.state = {
      canScroll: true,
      inViewPort: true,
    };
  }

  // Helper method to safely perform programmatic scrolling
  performProgrammaticScroll(top) {
    this.isProgrammaticScroll = true;
    this.myRef.current.scrollTo({
      top: Math.max(0, top),
      behavior: "smooth",
    });
    setTimeout(() => {
      this.isProgrammaticScroll = false;
    }, HtxParagraphsView.SCROLL_FLAG_TIMEOUT);
  }

  // Helper method to check if scrolling should happen
  shouldScroll() {
    return (
      isFF(FF_LSDV_E_278) &&
      this.props.item.contextscroll &&
      this.props.item.playingId >= 0 &&
      this.lastPlayingId !== this.props.item.playingId &&
      this.state.canScroll &&
      this.state.inViewPort
    );
  }

  // Helper method to get container padding
  getContainerPadding() {
    return Number.parseInt(window.getComputedStyle(this.myRef.current)?.getPropertyValue("padding-top")) || 0;
  }

  // Helper method to calculate precise phrase position
  calculatePhraseScrollPosition(playingId) {
    const root = this.myRef.current;
    const phraseElement = root.querySelector(`[data-testid="phrase:${playingId}"]`);

    if (!phraseElement) return 0;

    const phraseRect = phraseElement.getBoundingClientRect();
    const containerRect = root.getBoundingClientRect();

    return phraseRect.top - containerRect.top + root.scrollTop;
  }

  // Helper method to handle tall phrases that need multiple scroll steps
  handleTallPhraseScroll(phraseHeight, duration) {
    const padding = this.getContainerPadding();
    const wrapperOffsetTop = this.activeRef.current?.offsetTop - padding;
    const splitSteps = Math.ceil(this.activeRef.current?.offsetHeight / this.myRef.current?.offsetHeight) + 1;

    for (let i = 0; i < splitSteps; i++) {
      this.scrollTimeout.push(
        setTimeout(
          () => {
            const scrollPosition = wrapperOffsetTop + phraseHeight * (i * (1 / splitSteps));
            if (this.state.inViewPort && this.state.canScroll) {
              this.performProgrammaticScroll(scrollPosition);
            }
          },
          (duration / splitSteps) * i * 1000,
        ),
      );
    }
  }

  // Helper method to handle normal-sized phrases
  handleNormalPhraseScroll() {
    if (!this.state.inViewPort) return;

    if (this.props.item.playingId <= 0) {
      // Special case: scroll to top with padding for beginning
      this.performProgrammaticScroll(this.getContainerPadding());
    } else {
      // Use precise positioning to ensure phrase is at the top
      const targetScrollTop = this.calculatePhraseScrollPosition(this.props.item.playingId);
      this.performProgrammaticScroll(targetScrollTop);
    }
  }

  getSelectionText(sel) {
    return sel.toString();
  }

  getPhraseElement(node) {
    const cls = this.props.item.layoutClasses;

    while (node && (!node.classList || !node.classList.contains(cls.text))) node = node.parentNode;
    return node;
  }

  get phraseElements() {
    return [...this.myRef.current.getElementsByClassName(this.props.item.layoutClasses.text)];
  }

  /**
   * Check for the selection in the phrase and return the offset and index.
   *
   * @param {HTMLElement} node
   * @param {number} offset
   * @param {boolean} [isStart=true]
   * @return {Array} [offset, node, index, originalIndex]
   */
  getOffsetInPhraseElement(container, offset, isStart = true) {
    const node = this.getPhraseElement(container);
    const range = document.createRange();

    range.setStart(node, 0);
    range.setEnd(container, offset);
    const fullOffset = range.toString().length;
    const phraseIndex = this.phraseElements.indexOf(node);
    let phraseNode = node;

    // if the selection is made from the very end of a given phrase, we need to
    // move the offset to the beginning of the next phrase
    if (isStart && fullOffset === phraseNode.textContent.length) {
      return [0, phraseNode, phraseIndex + 1, phraseIndex];
    }
    // if the selection is made to the very beginning of the next phrase, we need to
    // move the offset to the end of the previous phrase
    if (!isStart && fullOffset === 0) {
      phraseNode = this.phraseElements[phraseIndex - 1];
      return [phraseNode.textContent.length, phraseNode, phraseIndex - 1, phraseIndex];
    }

    return [fullOffset, phraseNode, phraseIndex, phraseIndex];
  }

  removeSurroundingNewlines(text) {
    return text.replace(/^\n+/, "").replace(/\n+$/, "");
  }

  captureDocumentSelection() {
    const item = this.props.item;
    const cls = item.layoutClasses;
    const names = [...this.myRef.current.getElementsByClassName(cls.name)];

    names.forEach((el) => {
      el.style.visibility = "hidden";
    });

    let i;

    const ranges = [];
    const selection = window.getSelection();

    if (selection.isCollapsed) {
      names.forEach((el) => {
        el.style.visibility = "unset";
      });
      return [];
    }

    for (i = 0; i < selection.rangeCount; i++) {
      const r = selection.getRangeAt(i);

      if (r.endContainer.nodeType !== Node.TEXT_NODE) {
        // offsets work differently for nodes and texts, so we have to find #text.
        // lastChild because most probably this is div of the whole paragraph,
        // and it has author div and phrase div.
        const el = this.getPhraseElement(r.endContainer.lastChild);
        let textNode = el;

        while (textNode && textNode.nodeType !== Node.TEXT_NODE) {
          textNode = textNode.firstChild;
        }

        // most probably this div is out of Paragraphs
        // @todo maybe select till the end of Paragraphs?
        if (!textNode) continue;

        r.setEnd(textNode, 0);
      }

      if (r.collapsed || /^\s*$/.test(r.toString())) continue;

      try {
        splitBoundaries(r);
        const [startOffset, , start, originalStart] = this.getOffsetInPhraseElement(r.startContainer, r.startOffset);
        const [endOffset, , end, _originalEnd] = this.getOffsetInPhraseElement(r.endContainer, r.endOffset, false);

        // if this shifts backwards, we need to take the lesser index.
        const originalEnd = Math.min(end, _originalEnd);

        if (isFF(FF_DEV_2918)) {
          const visibleIndexes = item._value.reduce((visibleIndexes, v, idx) => {
            const isContentVisible = item.isVisibleForAuthorFilter(v);

            if (isContentVisible && originalStart <= idx && originalEnd >= idx) {
              visibleIndexes.push(idx);
            }

            return visibleIndexes;
          }, []);

          if (visibleIndexes.length !== originalEnd - originalStart + 1) {
            const texts = this.phraseElements;
            let fromIdx = originalStart;

            for (let k = 0; k < visibleIndexes.length; k++) {
              const curIdx = visibleIndexes[k];
              const isLastVisibleIndex = k === visibleIndexes.length - 1;

              if (isLastVisibleIndex || visibleIndexes[k + 1] !== curIdx + 1) {
                let anchorOffset;
                let focusOffset;

                const _range = r.cloneRange();

                if (fromIdx === originalStart) {
                  fromIdx = start;
                  anchorOffset = startOffset;
                } else {
                  anchorOffset = 0;

                  const walker = texts[fromIdx].ownerDocument.createTreeWalker(texts[fromIdx], NodeFilter.SHOW_ALL);

                  while (walker.firstChild());

                  _range.setStart(walker.currentNode, anchorOffset);
                }
                if (curIdx === end) {
                  focusOffset = endOffset;
                } else {
                  const curRange = document.createRange();

                  curRange.selectNode(texts[curIdx]);
                  focusOffset = curRange.toString().length;

                  const walker = texts[curIdx].ownerDocument.createTreeWalker(texts[curIdx], NodeFilter.SHOW_ALL);

                  while (walker.lastChild());

                  _range.setEnd(walker.currentNode, walker.currentNode.length);
                }

                selection.removeAllRanges();
                selection.addRange(_range);

                const text = this.removeSurroundingNewlines(selection.toString());

                // Sometimes the selection is empty, which is the case for dragging from the end of a line above the
                // target line, while having collapsed lines between.
                if (text) {
                  ranges.push({
                    startOffset: anchorOffset,
                    start: String(fromIdx),
                    endOffset: focusOffset,
                    end: String(curIdx),
                    _range,
                    text,
                  });
                }

                if (visibleIndexes.length - 1 > k) {
                  fromIdx = visibleIndexes[k + 1];
                }
              }
            }
          } else {
            // user selection always has only one range, so we can use selection's text
            // which doesn't contain hidden elements (names in our case)
            ranges.push({
              startOffset,
              start: String(start),
              endOffset,
              end: String(end),
              _range: r,
              text: this.removeSurroundingNewlines(selection.toString()),
            });
          }
        } else {
          // user selection always has only one range, so we can use selection's text
          // which doesn't contain hidden elements (names in our case)
          ranges.push({
            startOffset,
            start: String(start),
            endOffset,
            end: String(end),
            _range: r,
            text: this.removeSurroundingNewlines(selection.toString()),
          });
        }
      } catch (err) {
        console.error("Can not get selection", err);
      }
    }

    names.forEach((el) => {
      el.style.visibility = "unset";
    });

    // BrowserRange#normalize() modifies the DOM structure and deselects the
    // underlying text as a result. So here we remove the selected ranges and
    // reapply the new ones.
    selection.removeAllRanges();

    return ranges;
  }

  // Removed unused expandSelectionForTripleClickSync and expandSelectionForTripleClickDebounced methods

  _selectRegions = (additionalMode) => {
    const { item } = this.props;
    const root = this.myRef.current;
    const selection = window.getSelection();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    const regions = [];

    while (walker.nextNode()) {
      const node = walker.currentNode;

      if (node.nodeName === "SPAN" && node.matches(this._regionSpanSelector) && isSelectionContainsSpan(node)) {
        const region = this._determineRegion(node);

        regions.push(region);
      }
    }
    if (regions.length) {
      if (additionalMode) {
        item.annotation.extendSelectionWith(regions);
      } else {
        item.annotation.selectAreas(regions);
      }
      selection.removeAllRanges();
    }
  };

  _determineRegion(element) {
    if (matchesSelector(element, this._regionSpanSelector)) {
      const span = element.tagName === "SPAN" ? element : element.closest(this._regionSpanSelector);
      const { item } = this.props;

      return item.regs.find((region) => region.find(span));
    }
  }

  _disposeTimeout() {
    if (this.scrollTimeout.length > 0) {
      this.scrollTimeout.forEach((timeout) => clearTimeout(timeout));
      this.scrollTimeout = [];
    }
  }

  // Removed unused processAnnotation method

  // Removed unused expandSelectionForTripleClick method

  /**
   * Capture document selection from a specific range
   */
  captureDocumentSelectionFromRange(range) {
    // Create a temporary selection with our expanded range
    const tempSelection = window.getSelection();
    tempSelection.removeAllRanges();
    tempSelection.addRange(range);
    // Use existing capture logic
    const result = this.captureDocumentSelection();
    return result;
  }

  /**
   * Check if creating a region would result in a duplicate
   * Only checks when FF_NER_SELECT_ALL is enabled
   * Prevents exact same position + exact same labels + exact same offsets
   */
  isDuplicateRegion(range, selectedLabels, control) {
    if (!isFF(FF_NER_SELECT_ALL)) {
      return false; // No duplicate detection when feature flag is off
    }

    const phraseStart = Number.parseInt(range.start, 10);
    const phraseEnd = Number.parseInt(range.end, 10);
    const startOffset = range.startOffset || 0;
    const endOffset = range.endOffset || 0;

    const item = this.props.item;
    const existingRegions = item.regs.filter((region) => {
      const regionStart = Number.parseInt(region.start, 10);
      const regionEnd = Number.parseInt(region.end, 10);
      const regionStartOffset = region.startOffset || 0;
      const regionEndOffset = region.endOffset || 0;

      // Only check for IDENTICAL boundaries AND offsets - allow any differences
      if (
        regionStart !== phraseStart ||
        regionEnd !== phraseEnd ||
        regionStartOffset !== startOffset ||
        regionEndOffset !== endOffset
      ) {
        return false; // Different boundaries or offsets = not a duplicate, allow it
      }

      // Boundaries and offsets are identical, now check if labels match exactly
      const labelingResult = region.results?.find((r) => r.from_name?.isLabeling);
      const regionLabels = labelingResult?.mainValue || [];

      // Check if labels match exactly
      if (selectedLabels.length !== regionLabels.length) {
        return false; // Different number of labels = not a duplicate
      }

      // Same boundaries + same offsets + same labels = true duplicate
      return selectedLabels.every((label) => regionLabels.includes(label));
    });

    return existingRegions.length > 0;
  }

  /**
   * Create annotation from selected ranges. If the enhanced feature is enabled,
   * the newly created region will be automatically selected.
   * @param {Array} selectedRanges - The ranges to create annotations from
   */
  createAnnotationFromRanges(selectedRanges) {
    const item = this.props.item;

    // Check for duplicates using centralized logic
    if (selectedRanges && selectedRanges.length > 0) {
      // Get currently selected labels - use same logic as addRegions (states[0])
      const states = item.activeStates && item.activeStates();
      if (states && states.length > 0) {
        const control = states[0]; // Match addRegions logic - use first control
        const selectedLabels = control.selectedValues() || [];

        // Check ALL ranges for duplicates, not just the first one
        for (const range of selectedRanges) {
          if (this.isDuplicateRegion(range, selectedLabels, control)) {
            return; // Block the entire operation if ANY range would be a duplicate
          }
        }
      }
    }

    item._currentSpan = null;
    let createdRegion = null;
    // Check if a label is selected
    const states = item.activeStates && item.activeStates();
    if (!states || states.length === 0) {
      console.warn("No label selected. Annotation will not be created.");
    }
    if (isFF(FF_DEV_2918)) {
      const htxRanges = item.addRegions(selectedRanges);
      if (htxRanges && htxRanges.length > 0) {
        createdRegion = htxRanges[0]; // Get the first created region
        for (const htxRange of htxRanges) {
          const spans = htxRange.createSpans();
          htxRange.addEventsToSpans(spans);
        }
      }
    } else {
      createdRegion = item.addRegion(selectedRanges[0]);
      if (createdRegion) {
        const spans = createdRegion.createSpans();
        createdRegion.addEventsToSpans(spans);
      }
    }
  }

  createAnnotationForPhrase = (phraseIndex) => {
    const item = this.props.item;
    const phrases = item._value;
    if (!phrases || phraseIndex < 0 || phraseIndex >= phrases.length) return;
    const cls = item.layoutClasses;
    const phraseElements = this.myRef.current?.getElementsByClassName(cls.text);
    if (!phraseElements) return;
    const phraseElement = phraseElements[phraseIndex];
    if (!phraseElement) return;

    // Find the first and last text nodes in the phrase
    const walker = document.createTreeWalker(phraseElement, NodeFilter.SHOW_TEXT, null, false);
    const firstTextNode = walker.nextNode();
    if (!firstTextNode) return;
    let lastTextNode = firstTextNode;
    let currentNode;
    while ((currentNode = walker.nextNode())) {
      lastTextNode = currentNode;
    }
    // Create a range that covers the entire phrase
    const range = document.createRange();
    range.setStart(firstTextNode, 0);
    range.setEnd(lastTextNode, lastTextNode.textContent.length);
    // Set the selection in the DOM for visual feedback
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    // Use the same logic as manual selection to create the annotation
    const selectedRanges = this.captureDocumentSelectionFromRange(range);
    if (selectedRanges.length > 0) {
      this.createAnnotationFromRanges(selectedRanges);
    }
  };

  onMouseUp(ev) {
    const item = this.props.item;
    const states = item.activeStates();

    if (!states || states.length === 0 || ev.ctrlKey || ev.metaKey)
      return this._selectRegions(ev.ctrlKey || ev.metaKey);

    if (item.annotation.isReadOnly()) {
      return;
    }

    const selectedRanges = this.captureDocumentSelection();
    if (selectedRanges.length === 0) {
      return;
    }
    item._currentSpan = null;

    let createdRegion = null;

    if (isFF(FF_DEV_2918)) {
      const htxRanges = item.addRegions(selectedRanges);
      if (htxRanges && htxRanges.length > 0) {
        createdRegion = htxRanges[0];
      }
      for (const htxRange of htxRanges) {
        const spans = htxRange.createSpans();
        htxRange.addEventsToSpans(spans);
      }
    } else {
      createdRegion = item.addRegion(selectedRanges[0]);
      if (createdRegion) {
        const spans = createdRegion.createSpans();
        createdRegion.addEventsToSpans(spans);
      }
    }
  }

  /**
   * Generates a textual representation of the current selection range.
   *
   * @param {number} start
   * @param {number} end
   * @param {number} startOffset
   * @param {number} endOffset
   * @returns {string}
   */
  _getResultText(start, end, startOffset, endOffset) {
    const phrases = this.phraseElements;

    if (start === end) return phrases[start].innerText.slice(startOffset, endOffset);

    return [
      phrases[start].innerText.slice(startOffset),
      phrases.slice(start + 1, end).map((phrase) => phrase.innerText),
      phrases[end].innerText.slice(0, endOffset),
    ]
      .flat()
      .join("");
  }

  _handleUpdate() {
    const root = this.myRef.current;
    const { item } = this.props;

    // wait until text is loaded
    if (!item._value) return;

    item.regs.forEach((r, i) => {
      // spans can be totally missed if this is app init or undo/redo
      // or they can be disconnected from DOM on annotations switching
      // so we have to recreate them from regions data
      if (r._spans?.[0]?.isConnected) return;

      try {
        const phrases = root.children;
        const range = document.createRange();
        const startNode = phrases[r.start].getElementsByClassName(item.layoutClasses.text)[0];
        const endNode = phrases[r.end].getElementsByClassName(item.layoutClasses.text)[0];

        let { startOffset, endOffset } = r;

        range.setStart(...findNodeAt(startNode, startOffset));
        range.setEnd(...findNodeAt(endNode, endOffset));

        if (r.text && range.toString().replace(/\s+/g, "") !== r.text.replace(/\s+/g, "")) {
          console.info("Restore broken position", i, range.toString(), "->", r.text, r);
          if (
            // span breaks the mock-up by its end, so the start of next one is wrong
            item.regs.slice(0, i).some((other) => r.start === other.end) &&
            // for now there are no fallback for huge wrong regions
            r.start === r.end
          ) {
            // find region's text in the node (disregarding spaces)
            const match = startNode.textContent.match(new RegExp(r.text.replace(/\s+/g, "\\s+")));

            if (!match) console.warn("Can't find the text", r);
            const { index = 0 } = match || {};

            if (r.endOffset - r.startOffset !== r.text.length)
              console.warn("Text length differs from region length; possible regions overlap");
            startOffset = index;
            endOffset = startOffset + r.text.length;

            range.setStart(...findNodeAt(startNode, startOffset));
            range.setEnd(...findNodeAt(endNode, endOffset));
            r.fixOffsets(startOffset, endOffset);
          }
        } else if (!r.text && range.toString()) {
          r.setText(this._getResultText(+r.start, +r.end, startOffset, endOffset));
        }

        splitBoundaries(range);

        r._range = range;
        const spans = r.createSpans();

        r.addEventsToSpans(spans);
      } catch (err) {
        console.log(err, r);
      }
    });

    Array.from(this.myRef.current.getElementsByTagName("a")).forEach((a) => {
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        return false;
      });
    });

    if (this.shouldScroll()) {
      const playingItem = this.props.item._value[this.props.item.playingId];
      const phraseHeight = this.activeRef.current?.offsetHeight || 0;
      const duration = playingItem.duration || playingItem.end - playingItem.start;
      const wrapperHeight = root.offsetHeight;

      this._disposeTimeout();

      if (phraseHeight > wrapperHeight) {
        // Handle tall phrases that need multiple scroll steps
        this.handleTallPhraseScroll(phraseHeight, duration);
      } else {
        // Handle normal-sized phrases
        this.handleNormalPhraseScroll();
      }
      this.lastPlayingId = this.props.item.playingId;
    }
  }

  _handleScrollContainerHeight = () => {
    requestAnimationFrame(() => {
      const container = this.myRef.current;
      const mainContentView = document.querySelector(this.mainContentSelector);
      const mainRect = mainContentView.getBoundingClientRect();
      const visibleHeight = document.documentElement.clientHeight - mainRect.top;
      const annotationView = document.querySelector(this.mainViewAnnotationSelector);
      const totalVisibleSpace = Math.floor(
        visibleHeight < mainRect.height ? visibleHeight : mainContentView?.offsetHeight || 0,
      );
      const filledSpace = annotationView?.offsetHeight || mainContentView.firstChild?.offsetHeight || 0;
      const containerHeight = container?.offsetHeight || 0;
      const viewPadding =
        Number.parseInt(window.getComputedStyle(mainContentView)?.getPropertyValue("padding-bottom")) || 0;
      const height = totalVisibleSpace - (filledSpace - containerHeight) - viewPadding;
      const minHeight = 100;

      if (container) this.myRef.current.style.maxHeight = `${height < minHeight ? minHeight : height}px`;
    });
  };

  _resizeObserver = new ResizeObserver(this._handleScrollContainerHeight);

  componentDidUpdate() {
    this._handleUpdate();
  }

  componentDidMount() {
    if (isFF(FF_LSDV_E_278) && this.props.item.contextscroll)
      this._resizeObserver.observe(document.querySelector(this.mainContentSelector));
    this._handleUpdate();

    // Set default selection to first phrase when there's no audio
    const { item } = this.props;
    if (!item.audio && item._value && item._value.length > 0 && item.playingId === -1) {
      item.seekToPhrase(0);
    }

    if (isFF(FF_NER_SELECT_ALL)) {
      item.setViewRef(this);
    }
  }

  componentWillUnmount() {
    const target = document.querySelector(this.mainContentSelector);

    if (target) this._resizeObserver?.unobserve(target);
    this._resizeObserver?.disconnect();
    if (isFF(FF_NER_SELECT_ALL)) {
      this.props.item.setViewRef(null);
    }
  }

  // Check if any labels are selected for the current annotation (reactive to MobX changes)
  get hasSelectedLabels() {
    if (!isFF(FF_NER_SELECT_ALL)) return false;

    try {
      const { item } = this.props;
      const states = item.activeStates && item.activeStates();

      return !!(states && states.length > 0);
    } catch (error) {
      console.warn("Error checking selected labels:", error);
      return false;
    }
  }

  selectText = (phraseIndex) => {
    const item = this.props.item;
    const phrases = item._value;
    const cls = item.layoutClasses;
    const phraseElements = this.myRef.current?.getElementsByClassName(cls.text);

    if (!phrases || phraseIndex < 0 || phraseIndex >= phrases.length || !phraseElements) return;

    const phraseElement = phraseElements[phraseIndex];
    if (!phraseElement) return;

    const range = document.createRange();
    range.selectNodeContents(phraseElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  };

  setIsInViewPort(isInViewPort) {
    this.setState({ inViewPort: isInViewPort });
  }

  // Handle manual scrolling to disable auto-scroll
  onScroll = () => {
    // Only disable auto-scroll for user-initiated scrolling, not programmatic scrolling
    if (this.state.inViewPort && !this.isProgrammaticScroll) {
      this.setState({ inViewPort: false });
    }
  };

  // Helper to select all regions for a phrase index
  selectRegionsForPhrase = (phraseIdx) => {
    if (!isFF(FF_NER_SELECT_ALL)) return;

    const item = this.props.item;
    if (!item || !item.annotation || !item.annotation.results) return;

    // Only deselect regions, not labels
    item.annotation.unselectAreas();

    // Get all regions for this phrase
    const phraseRegions = this.getRegionsForPhrase(phraseIdx);

    // If there are regions, automatically select the first one
    if (phraseRegions.length > 0) {
      this.selectRegion(phraseRegions[0]);
    }
  };

  // Move to the next phrase
  handleNextPhrase = () => {
    const item = this.props.item;
    if (!item) return;
    item.goToNextPhrase();
    this.selectRegionsForPhrase(item.playingId);
  };

  // Move to the previous phrase
  handlePreviousPhrase = () => {
    const item = this.props.item;
    if (!item) return;
    item.goToPreviousPhrase();
    this.selectRegionsForPhrase(item.playingId);
  };

  // Select all text in the current phrase and annotate
  handleSelectAllAndAnnotate = () => {
    const item = this.props.item;
    if (!item) return;
    item.selectAllAndAnnotateCurrentPhrase();
  };

  // Get all regions for the current phrase
  getRegionsForPhrase = (phraseIdx) => {
    if (!isFF(FF_NER_SELECT_ALL)) return [];

    const item = this.props.item;
    if (!item || !item.annotation) return [];

    const regions = item.annotation.regionStore?.regions || item.annotation.regions;
    return regions.filter((region) => {
      const start = Number.parseInt(region.start, 10);
      const end = Number.parseInt(region.end, 10);
      return !isNaN(start) && !isNaN(end) && start <= phraseIdx && end >= phraseIdx;
    });
  };

  // Helper to select a region using the proper MobX-State-Tree action
  selectRegion = (region) => {
    if (!isFF(FF_NER_SELECT_ALL)) return false;

    const item = this.props.item;

    item.annotation.selectArea(region);
    return true;
  };

  // Cycle through regions in the current phrase (Ctrl+Right)
  handleNextRegion = () => {
    if (!isFF(FF_NER_SELECT_ALL)) return;

    const item = this.props.item;
    if (!item || typeof item.playingId !== "number" || item.playingId < 0) return;

    const phraseRegions = this.getRegionsForPhrase(item.playingId);
    if (phraseRegions.length === 0) return;

    const selectedRegions = item.annotation.selectedRegions || [];
    let currentIndex = -1;
    if (selectedRegions.length > 0) {
      currentIndex = phraseRegions.findIndex((region) => selectedRegions.includes(region));
    }

    const nextIndex = (currentIndex + 1) % phraseRegions.length;
    item.annotation.unselectAll();
    this.selectRegion(phraseRegions[nextIndex]);
  };

  // Cycle through regions in the current phrase (Ctrl+Left)
  handlePreviousRegion = () => {
    if (!isFF(FF_NER_SELECT_ALL)) return;

    const item = this.props.item;
    if (!item || typeof item.playingId !== "number" || item.playingId < 0) return;

    const phraseRegions = this.getRegionsForPhrase(item.playingId);
    if (phraseRegions.length === 0) return;

    const selectedRegions = item.annotation.selectedRegions || [];
    let currentIndex = -1;
    if (selectedRegions.length > 0) {
      currentIndex = phraseRegions.findIndex((region) => selectedRegions.includes(region));
    }

    const prevIndex = currentIndex <= 0 ? phraseRegions.length - 1 : currentIndex - 1;
    item.annotation.unselectAll();
    this.selectRegion(phraseRegions[prevIndex]);
  };

  renderWrapperHeader() {
    const { item } = this.props;

    return (
      <div className={styles.wrapper_header}>
        {isFF(FF_DEV_2669) && (
          <AuthorFilter
            item={item}
            onChange={() => {
              this.setState({
                canScroll: !this.state.canScroll,
              });
            }}
          />
        )}
        {item.contextscroll && (
          <div className={styles.wrapper_header__buttons}>
            <Toggle
              data-testid={"auto-scroll-toggle"}
              checked={this.state.canScroll}
              onChange={() => {
                this.setState({
                  canScroll: !this.state.canScroll,
                });
              }}
              label={"Auto-scroll"}
            />
            <Tooltip alignment="top-left" title="Automatically sync transcript scrolling with audio playback">
              <IconHelp />
            </Tooltip>
          </div>
        )}
      </div>
    );
  }

  render() {
    const { item } = this.props;
    const withAudio = !!item.audio;
    const contextScroll = isFF(FF_LSDV_E_278) && this.props.item.contextscroll;

    if (!item.playing && isFF(FF_LSDV_E_278)) this._disposeTimeout(); // dispose scroll timeout when the audio is not playing

    // current way to not render when we wait for data
    if (isFF(FF_DEV_2669) && !item._value) return null;

    return (
      <>
        <ParagraphHotkeys item={item} />
        <ObjectTag item={item} className={cnm(cn("paragraphs").toClassName(), styles.paragraphs)}>
          {withAudio && <ParagraphAudio item={item} />}
          {isFF(FF_LSDV_E_278) ? this.renderWrapperHeader() : isFF(FF_DEV_2669) && <AuthorFilter item={item} />}
          <div
            ref={this.myRef}
            data-testid="phrases-wrapper"
            data-update={item._update}
            className={contextScroll ? styles.scroll_container : styles.container}
            onMouseUp={this.onMouseUp.bind(this)}
            onScroll={this.onScroll.bind(this)}
          >
            <Phrases
              setIsInViewPort={this.setIsInViewPort.bind(this)}
              item={item}
              playingId={item.playingId}
              hasSelectedLabels={this.hasSelectedLabels}
              {...(isFF(FF_LSDV_E_278) ? { activeRef: this.activeRef } : {})}
            />
          </div>
        </ObjectTag>
      </>
    );
  }
}

export const HtxParagraphs = inject("store")(observer(HtxParagraphsView));
