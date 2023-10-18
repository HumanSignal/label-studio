import React, { Component } from 'react';
import { htmlEscape, matchesSelector, moveStylesBetweenHeadTags } from '../../../utils/html';
import ObjectTag from '../../../components/Tags/Object';
import * as xpath from 'xpath-range';
import { inject, observer } from 'mobx-react';
import Utils from '../../../utils';
import { fixCodePointsInRange } from '../../../utils/selection-tools';
import './RichText.styl';
import { isAlive } from 'mobx-state-tree';
import { LoadingOutlined } from '@ant-design/icons';
import { Block, cn, Elem } from '../../../utils/bem';
import { observe } from 'mobx';
import { FF_LSDV_4620_3, isFF } from '../../../utils/feature-flags';

const DBLCLICK_TIMEOUT = 450; // ms
const DBLCLICK_RANGE = 5; // px

class RichTextPieceView extends Component {
  _regionSpanSelector = '.htx-highlight';
  _regionVisibleSpanSelector = '.htx-highlight:not(.__hidden)';

  loadingRef = React.createRef();

  // store value of first selected label during double click to apply it later
  doubleClickSelection;

  _selectRegions = (additionalMode) => {
    const { item } = this.props;
    const root = item.visibleNodeRef.current;
    const selection = window.getSelection();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    const regions = [];

    while (walker.nextNode()) {
      const node = walker.currentNode;

      if (node.nodeName === 'SPAN' && node.matches(isFF(FF_LSDV_4620_3) ? this._regionVisibleSpanSelector : this._regionSpanSelector) && selection.containsNode(node)) {
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

  _onMouseUp = (ev) => {
    const { item } = this.props;
    const states = item.activeStates();
    const rootEl = item.visibleNodeRef.current;
    const root = rootEl?.contentDocument?.body ?? rootEl;

    if (!states || states.length === 0 || ev.ctrlKey || ev.metaKey) return this._selectRegions(ev.ctrlKey || ev.metaKey);
    if (item.selectionenabled === false || item.annotation.isReadOnly()) return;
    const label = states[0]?.selectedLabels?.[0];
    const value = states[0]?.selectedValues?.();

    Utils.Selection.captureSelection(({ selectionText, range }) => {
      if (!range || range.collapsed || !root.contains(range.startContainer) || !root.contains(range.endContainer)) {
        return;
      }

      fixCodePointsInRange(range);

      const normedRange = xpath.fromRange(range, root);

      if (!normedRange) return;

      if (this.doubleClickSelection && (
        Date.now() - this.doubleClickSelection.time > DBLCLICK_TIMEOUT
        || Math.abs(ev.pageX - this.doubleClickSelection.x) > DBLCLICK_RANGE
        || Math.abs(ev.pageY - this.doubleClickSelection.y) > DBLCLICK_RANGE
      )) {
        this.doubleClickSelection = undefined;
      }

      normedRange._range = range;
      normedRange.text = selectionText;
      normedRange.isText = item.type === 'text';
      normedRange.dynamic = this.props.store.autoAnnotation;
      item.addRegion(normedRange, this.doubleClickSelection);
    }, {
      window: rootEl?.contentWindow ?? window,
      granularity: label?.granularity ?? item.granularity,
      beforeCleanup: () => {
        this.doubleClickSelection = undefined;
        this._selectionMode = true;
      },
    });
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
  _onRegionClick = event => {
    if (this._selectionMode) {
      this._selectionMode = false;
      return;
    }
    if (!this.props.item.clickablelinks && matchesSelector(event.target, 'a[href]')) {
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
  _onRegionMouseOver = event => {
    const region = this._determineRegion(event.target);
    const { item } = this.props;

    item.setHighlight(region);
  };

  _removeChildrenFrom(el) {
    while (el.lastChild) {
      el.removeChild(el.lastChild);
    }
  }

  _moveElements(src, dest, withSubstitution) {
    const fragment = document.createDocumentFragment();

    for (let i = 0;i < src.childNodes.length; withSubstitution && i++) {
      const currentChild = src.childNodes[i];

      if (withSubstitution) {
        const cloneChild = currentChild.cloneNode(true);

        src.replaceChild(cloneChild, currentChild);
      }

      fragment.append(currentChild);
    }
    this._removeChildrenFrom(dest);
    dest.appendChild(fragment);
  }

  _moveStyles = moveStylesBetweenHeadTags;

  _moveElementsToWorkingNode = () => {
    const { item } = this.props;
    const rootEl = item.visibleNodeRef.current;
    const workingEl = item.workingNodeRef.current;

    if (item.inline) {
      this._moveElements(rootEl, workingEl, true);
    } else {
      const rootHtml = rootEl.contentDocument.documentElement;
      const rootBody = rootEl.contentDocument.body;
      const workingHtml = workingEl.contentDocument.documentElement;
      const workingHead = workingEl.contentDocument.head;
      const workingBody = workingEl.contentDocument.body;

      workingHtml.setAttribute('style', rootHtml.getAttribute('style'));
      this._removeChildrenFrom(workingHead);
      this._moveElements(rootBody, workingBody, true);
    }
    item.setWorkingMode(true);
  };

  _returnElementsFromWorkingNode = () => {
    const { item } = this.props;
    const rootEl = item.visibleNodeRef.current;
    const workingEl = item.workingNodeRef.current;

    if (item.inline) {
      this._moveElements(workingEl, rootEl);
    } else {
      const rootHtml = rootEl.contentDocument.documentElement;
      const rootHead = rootEl.contentDocument.head;
      const rootBody = rootEl.contentDocument.body;
      const workingHtml = workingEl.contentDocument.documentElement;
      const workingHead = workingEl.contentDocument.head;
      const workingBody = workingEl.contentDocument.body;

      rootHtml.setAttribute('style', workingHtml.getAttribute('style'));
      this._moveStyles(workingHead, rootHead);
      this._moveElements(workingBody, rootBody);
    }
    item.setWorkingMode(false);
  };

  /**
   * Handle initial rendering and all subsequent updates
   */
  _handleUpdate(initial = false) {
    const { item } = this.props;
    const rootEl = item.visibleNodeRef.current;
    const root = rootEl?.contentDocument?.body ?? rootEl;

    if (!item.inline) {
      if (!root || root.tagName === 'IFRAME' || !root.childNodes.length || item.isLoaded === false) return;
    }

    // Apply highlight to ranges of a current tag
    // Also init regions' offsets and html range on initial load

    if (initial && item.annotation) {
      const { history, pauseAutosave, startAutosave } = item.annotation;

      pauseAutosave();
      history.freeze('richtext:init');
      item.needsUpdate();
      history.setReplaceNextUndoState(true);
      history.unfreeze('richtext:init');
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
    const spanSelector = isFF(FF_LSDV_4620_3) ? this._regionVisibleSpanSelector : this._regionSpanSelector;
    
    if (matchesSelector(element, spanSelector)) {
      const span = element.tagName === 'SPAN' && (!isFF(FF_LSDV_4620_3) || element.matches(spanSelector)) ? element : element.closest(spanSelector);
      const { item } = this.props;

      return item.regs.find(region => region.find(span));
    }
  }

  componentDidMount() {
    const { item } = this.props;

    if (!isFF(FF_LSDV_4620_3)) {
      item.setNeedsUpdateCallbacks(
        this._moveElementsToWorkingNode,
        this._returnElementsFromWorkingNode,
      );
    }

    if (!item.inline) {
      this.dispose = observe(item, '_isReady', this.updateLoadingVisibility, true);
    }
  }

  componentWillUnmount() {
    const { item } = this.props;

    if (!item || !isAlive(item)) return;

    this.dispose?.();
    item.setLoaded(false);
    item.setReady(false);
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
      loadingEl.setAttribute('style', 'display: none');
    } else {
      loadingEl.removeAttribute('style');
    }
  };

  _passHotkeys = e => {
    const props = 'key code keyCode location ctrlKey shiftKey altKey metaKey'.split(' ');
    const init = {};

    for (const prop of props) init[prop] = e[prop];

    const internal = new KeyboardEvent(e.type, init);

    document.dispatchEvent(internal);
  };

  onIFrameLoad = () => {
    const { item } = this.props;
    const iframe = item.visibleNodeRef.current;
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
    const style = doc.createElement('style');

    style.textContent = 'body a[href] { pointer-events: all; }';
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
      iframe.style.height = Math.max(body.scrollHeight, htmlEl.offsetHeight) + 'px';
    }

    this.markObjectAsLoaded();
  };

  render() {
    const { item } = this.props;

    if (!item._value) return null;

    let val = item._value || '';
    const newLineReplacement = '<br/>';
    const settings = this.props.store.settings;
    const isText = item.type === 'text';

    if (isText) {
      const cnLine = cn('richtext', { elem: 'line' });

      val = htmlEscape(val)
        .split(/\n|\r/g)
        .map(s => `<span class="${cnLine}">${s}</span>`)
        .join(newLineReplacement);
    }

    if (item.inline) {
      const eventHandlers = {
        onClickCapture: this._onRegionClick,
        onMouseUp: this._onMouseUp,
        onMouseOverCapture: this._onRegionMouseOver,
      };

      return (
        <Block
          name="richtext"
          tag={ObjectTag}
          item={item}
        >
          <Elem
            key="root"
            name="container"
            ref={el => {
              item.visibleNodeRef.current = el;
              el && this.markObjectAsLoaded();
            }}
            data-linenumbers={isText && settings.showLineNumbers ? 'enabled' : 'disabled'}
            className="htx-richtext"
            dangerouslySetInnerHTML={{ __html: val }}
            {...eventHandlers}
          />
          {isFF(FF_LSDV_4620_3) ? null : (
            <>
              <Elem
                key="orig"
                name="orig-container"
                ref={item.originalContentRef}
                className="htx-richtext-orig"
                dangerouslySetInnerHTML={{ __html: val }}
              />
              <Elem
                key="work"
                name="work-container"
                ref={item.workingNodeRef}
                className="htx-richtext-work"
              />
            </>
          )}
        </Block>
      );
    } else {
      return (
        <Block
          name="richtext"
          tag={ObjectTag}
          item={item}
        >
          <Elem name="loading" ref={this.loadingRef}>
            <LoadingOutlined />
          </Elem>

          <Elem
            key="root"
            name="iframe"
            tag="iframe"
            referrerPolicy="no-referrer"
            sandbox="allow-same-origin allow-scripts"
            ref={el => {
              item.setReady(false);
              item.visibleNodeRef.current = el;
            }}
            className="htx-richtext"
            srcDoc={val}
            onLoad={this.onIFrameLoad}
          />
          {isFF(FF_LSDV_4620_3) ? null : (
            <><Elem
              key="orig"
              name="orig-iframe"
              tag="iframe"
              referrerPolicy="no-referrer"
              sandbox="allow-same-origin allow-scripts"
              ref={item.originalContentRef}
              className="htx-richtext-orig"
              srcDoc={val}
            />
            <Elem
              key="work"
              name="work-iframe"
              tag="iframe"
              referrerPolicy="no-referrer"
              sandbox="allow-same-origin allow-scripts"
              ref={item.workingNodeRef}
              className="htx-richtext-work"
            />
            </>
          )}
        </Block>
      );
    }
  }
}

const storeInjector = inject('store');

const RPTV = storeInjector(observer(RichTextPieceView));

export const HtxRichText = ({ isText = false } = {}) => {
  return storeInjector(observer(props => {
    return <RPTV {...props} isText={isText} />;
  }));
};
