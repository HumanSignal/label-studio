import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';

import ObjectTag from '../../../components/Tags/Object';
import { FF_DEV_2669, FF_DEV_2918, FF_LSDV_4711, FF_LSDV_E_278, isFF } from '../../../utils/feature-flags';
import { findNodeAt, matchesSelector, splitBoundaries } from '../../../utils/html';
import { isSelectionContainsSpan } from '../../../utils/selection-tools';
import styles from './Paragraphs.module.scss';
import { AuthorFilter } from './AuthorFilter';
import { Phrases } from './Phrases';
import Toggle from '../../../common/Toggle/Toggle';
import { IconHelp } from '../../../assets/icons';
import { Tooltip } from '../../../common/Tooltip/Tooltip';

const audioDefaultProps = {};

if (isFF(FF_LSDV_4711)) audioDefaultProps.crossOrigin = 'anonymous';

class HtxParagraphsView extends Component {
  _regionSpanSelector = '.htx-highlight';

  constructor(props) {
    super(props);
    this.myRef = React.createRef();
    this.activeRef = React.createRef();
    this.lastPlayingId = -1;
    this.scrollTimeout = [];
    this.isPlaying = false;
    this.state = {
      canScroll: true,
    };
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
    else if (!isStart && fullOffset === 0) {
      phraseNode = this.phraseElements[phraseIndex - 1];
      return [phraseNode.textContent.length, phraseNode, phraseIndex - 1, phraseIndex];
    }

    return [fullOffset, phraseNode, phraseIndex, phraseIndex];
  }

  removeSurroundingNewlines(text) {
    return text.replace(/^\n+/, '').replace(/\n+$/, '');
  }

  captureDocumentSelection() {
    const item = this.props.item;
    const cls = item.layoutClasses;
    const names = [...this.myRef.current.getElementsByClassName(cls.name)];

    names.forEach(el => {
      el.style.visibility = 'hidden';
    });

    let i;

    const ranges = [];
    const selection = window.getSelection();

    if (selection.isCollapsed) {
      names.forEach(el => {
        el.style.visibility = 'unset';
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
                let anchorOffset, focusOffset;

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
        console.error('Can not get selection', err);
      }
    }

    names.forEach(el => {
      el.style.visibility = 'unset';
    });

    // BrowserRange#normalize() modifies the DOM structure and deselects the
    // underlying text as a result. So here we remove the selected ranges and
    // reapply the new ones.
    selection.removeAllRanges();

    return ranges;
  }

  _selectRegions = (additionalMode) => {
    const { item } = this.props;
    const root = this.myRef.current;
    const selection = window.getSelection();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    const regions = [];

    while (walker.nextNode()) {
      const node = walker.currentNode;

      if (node.nodeName === 'SPAN' && node.matches(this._regionSpanSelector) && isSelectionContainsSpan(node)) {
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
      const span = element.tagName === 'SPAN' ? element : element.closest(this._regionSpanSelector);
      const { item } = this.props;

      return item.regs.find(region => region.find(span));
    }
  }

  _disposeTimeout() {
    if (this.scrollTimeout.length > 0){
      this.scrollTimeout.forEach(timeout => clearTimeout(timeout));
      this.scrollTimeout = [];
    }
  }

  onMouseUp(ev) {
    const item = this.props.item;
    const states = item.activeStates();

    if (!states || states.length === 0 || ev.ctrlKey || ev.metaKey) return this._selectRegions(ev.ctrlKey || ev.metaKey);

    const selectedRanges = this.captureDocumentSelection();

    if (selectedRanges.length === 0) {
      return;
    }

    item._currentSpan = null;

    if (isFF(FF_DEV_2918)) {
      const htxRanges = item.addRegions(selectedRanges);

      for (const htxRange of htxRanges) {
        const spans = htxRange.createSpans();

        htxRange.addEventsToSpans(spans);
      }
    } else {
      const htxRange = item.addRegion(selectedRanges[0]);

      if (htxRange) {
        const spans = htxRange.createSpans();

        htxRange.addEventsToSpans(spans);
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
      phrases.slice(start + 1, end).map(phrase => phrase.innerText),
      phrases[end].innerText.slice(0, endOffset),
    ].flat().join('');
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

        if (r.text && range.toString().replace(/\s+/g, '') !== r.text.replace(/\s+/g, '')) {
          console.info('Restore broken position', i, range.toString(), '->', r.text, r);
          if (
            // span breaks the mock-up by its end, so the start of next one is wrong
            item.regs.slice(0, i).some(other => r.start === other.end) &&
            // for now there are no fallback for huge wrong regions
            r.start === r.end
          ) {
            // find region's text in the node (disregarding spaces)
            const match = startNode.textContent.match(new RegExp(r.text.replace(/\s+/g, '\\s+')));

            if (!match) console.warn('Can\'t find the text', r);
            const { index = 0 } = match || {};

            if (r.endOffset - r.startOffset !== r.text.length)
              console.warn('Text length differs from region length; possible regions overlap');
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

    Array.from(this.myRef.current.getElementsByTagName('a')).forEach(a => {
      a.addEventListener('click', function(ev) {
        ev.preventDefault();
        return false;
      });
    });


    if (isFF(FF_LSDV_E_278) && this.props.item.contextscroll && item.playingId >= 0 && this.lastPlayingId !== item.playingId && this.state.canScroll) {
      const _padding = 8; // 8 is the padding between the phrases, so it will keep aligned with the top of the phrase
      const _playingItem = this.props.item._value[item.playingId];
      const _start = _playingItem.start;
      const _end = _playingItem.end;
      const _phaseHeight = this.activeRef.current?.offsetHeight || 0;
      const _duration = this.props.item._value[item.playingId].duration || _end - _start;
      const _wrapperHeight = root.offsetHeight;
      const _wrapperOffsetTop = this.activeRef.current?.offsetTop - _padding;
      const _splittedText = 10; // it will be from 0 to 100% of the text height, going 10% by 10%

      this._disposeTimeout();

      if (_phaseHeight > _wrapperHeight) {
        for (let i = 0; i < _splittedText; i++) {
          this.scrollTimeout.push(
            setTimeout(() => {
              const _pos = (_wrapperOffsetTop) + ((_phaseHeight - (_wrapperHeight / 3)) * (i * .1)); // 1/3 of the wrapper height is the offset to keep the text aligned with the middle of the wrapper

              root.scrollTo({
                top: _pos,
                behavior: 'smooth',
              });
            }, ((_duration / _splittedText) * i) * 1000),
          );
        }
      } else {
        root.scrollTo({
          top: _wrapperOffsetTop,
          behavior: 'smooth',
        });
      }

      this.lastPlayingId = item.playingId;
    }
  }

  _handleScrollContainerHeight() {
    const container = this.myRef.current;
    const mainContentView = document.querySelector('.lsf-main-content');
    const annotationView = document.querySelector('.lsf-main-view__annotation');
    const totalSpace = mainContentView?.offsetHeight || 0;
    const filledSpace = annotationView?.offsetHeight || 0;
    const containerHeight = container?.offsetHeight || 0;
    const viewPadding = parseInt(window.getComputedStyle(mainContentView)?.getPropertyValue('padding-bottom')) || 0;
    const height = totalSpace - (filledSpace - containerHeight) - (viewPadding);
    const minHeight = 100;

    if (container) this.myRef.current.style.maxHeight = `${height < minHeight ? minHeight : height}px`;
  }

  _handleScrollRoot() {
    this._disposeTimeout();
  }

  _resizeObserver = new ResizeObserver(() => this._handleScrollContainerHeight());

  componentDidUpdate() {
    this._handleUpdate();
  }

  componentDidMount() {
    if(isFF(FF_LSDV_E_278) && this.props.item.contextscroll) this._resizeObserver.observe(document.querySelector('.lsf-main-content'));
    this._handleUpdate();

    if(isFF(FF_LSDV_E_278))
      this.myRef.current.addEventListener('wheel', this._handleScrollRoot.bind(this));
  }

  componentWillUnmount() {
    const target = document.querySelector('.lsf-main-content');

    if(isFF(FF_LSDV_E_278))
      this.myRef.current.removeEventListener('wheel', this._handleScrollRoot);

    if (target) this._resizeObserver?.unobserve(target);
    this._resizeObserver?.disconnect();
  }

  renderWrapperHeader() {
    const { item } = this.props;

    return (
      <div className={styles.wrapper_header}>
        {isFF(FF_DEV_2669) && (
          <AuthorFilter item={item} />
        )}
        <div className={styles.wrapper_header__buttons}>
          <Toggle
            data-testid={'auto-scroll-toggle'}
            checked={this.state.canScroll}
            onChange={() => {
              this.setState({ canScroll: !this.state.canScroll });
            }}
            label={'Auto-scroll'}
          />
          <Tooltip placement="topLeft" title="Automatically sync transcript scrolling with audio playback">
            <IconHelp />
          </Tooltip>
        </div>
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
      <ObjectTag item={item} className={'lsf-paragraphs'} >
        {withAudio && (
          <audio
            {...audioDefaultProps} 
            controls={item.showplayer && !item.syncedAudio}
            className={styles.audio}
            src={item.audio}
            ref={item.audioRef}
            onLoadedMetadata={item.handleAudioLoaded}
            onEnded={item.reset}
            onError={item.handleError}
            onCanPlay={item.handleCanPlay}
          />
        )}
        {isFF(FF_LSDV_E_278) ? this.renderWrapperHeader() :
          isFF(FF_DEV_2669) && (
            <AuthorFilter item={item} />
          )
        }
        <div
          ref={this.myRef}
          data-testid="phrases-wrapper"
          data-update={item._update}
          className={contextScroll ? styles.scroll_container : styles.container}
          onMouseUp={this.onMouseUp.bind(this)}
        >
          <Phrases item={item} playingId={item.playingId} {...(isFF(FF_LSDV_E_278) ? { activeRef: this.activeRef }: {})} />
        </div>
      </ObjectTag>
    );
  }
}

export const HtxParagraphs = inject('store')(observer(HtxParagraphsView));
