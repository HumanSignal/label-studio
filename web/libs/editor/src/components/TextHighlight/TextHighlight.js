import emojiRegex from 'emoji-regex';
import React, { Component } from 'react';
import { observer } from 'mobx-react';

import Utils from '../../utils';
import Range from './Range';
import { HtxTextNode } from './Node';
import UrlNode from './UrlNode';
import EmojiNode from './EmojiNode';
import styles from './TextHighlight.module.scss';

class TextHighlight extends Component {
  constructor() {
    super();

    this.dismissMouseUp = 0;
  }

  /**
   * Return first ok element
   */
  getRange(charIndex) {
    if (this.props.ranges && this.props.ranges.length) {
      return this.props.ranges.find(range => charIndex >= range.start && charIndex <= range.end);
    }
  }

  /**
   * Function when the user mouse is over an highlighted text
   */
  onMouseOverHighlightedWord(range, visible) {
    if (visible && this.props.onMouseOverHighlightedWord) {
      this.props.onMouseOverHighlightedWord(range);
    }
  }

  getLetterNode(charIndex, range) {
    /**
     * Current symbol
     */
    const char = this.props.text[charIndex];

    let nl;

    /**
     * Line break
     */
    if (char && char.charCodeAt()) {
      nl = char.charCodeAt(0) === 10;
    }

    let arrOverlap = [];

    if (this.props.ranges) {
      this.props.ranges.map(range => {
        if (charIndex >= range.start && charIndex <= range.end) {
          return (arrOverlap = [...arrOverlap, range.id]);
        }

        return arrOverlap;
      });
    }

    return (
      <HtxTextNode
        id={this.props.id}
        overlap={arrOverlap}
        range={range}
        charIndex={charIndex}
        key={`${this.props.id}-${charIndex}`}
        highlightStyle={this.props.highlightStyle}
        // style={{padding: "2px 0", background: "linear-gradient(180deg, #fdcd3b 60%, #ffed4b 60%, red 9%)"}}
      >
        {nl ? <br /> : char}
      </HtxTextNode>
    );
  }

  getEmojiNode(charIndex, range) {
    let arrOverlap = [];

    if (this.props.ranges) {
      this.props.ranges.map(range => {
        if (charIndex >= range.start && charIndex <= range.end) {
          return (arrOverlap = [...arrOverlap, range.id]);
        }

        return arrOverlap;
      });
    }

    return (
      <EmojiNode
        text={this.props.text}
        id={this.props.id}
        overlap={arrOverlap}
        range={range}
        key={`${this.props.id}-emoji-${charIndex}`}
        charIndex={charIndex}
        highlightStyle={this.props.highlightStyle}
      />
    );
  }

  getUrlNode(charIndex, range, url) {
    let arrOverlap = [];

    if (this.props.ranges) {
      this.props.ranges.map(range => {
        if (charIndex >= range.start && charIndex <= range.end) {
          return (arrOverlap = [...arrOverlap, range.id]);
        }

        return arrOverlap;
      });
    }

    return (
      <UrlNode
        url={url}
        id={this.props.id}
        overlap={arrOverlap}
        range={range}
        key={`${this.props.id}-url-${charIndex}`}
        charIndex={charIndex}
        highlightStyle={this.props.highlightStyle}
      />
    );
  }

  mouseEvent() {
    if (!this.props.enabled) {
      return false;
    }

    let text = '';

    if (window.getSelection) {
      /**
       * Get highlited text
       * Tip: with helper elements (hints)
       */
      // text = window.getSelection().toString();

      if (window.getSelection().type === 'None') return;

      /**
       * Create clone range
       */
      const cloneCont = window
        .getSelection()
        .getRangeAt(0)
        .cloneRange();

      /**
       * The Range.cloneContents() returns a DocumentFragment copying the objects of type Node included in the Range.
       */
      const selectionContents = cloneCont.cloneContents();
      /**
       * Create virtual div with text
       */
      const virtualDiv = document.createElement('div');

      virtualDiv.appendChild(selectionContents);

      const elementsWithSup = virtualDiv.getElementsByTagName('sup');

      if (elementsWithSup.length > 0) {
        for (let i = 0; i < elementsWithSup.length; i++) {
          elementsWithSup[i].innerText = '';
        }
        text = virtualDiv.innerText;
      } else {
        text = virtualDiv.innerText;
      }
    } else if (document.selection && document.selection.type !== 'Control') {
      text = document.selection.createRange().text;
    }

    if (!text || !text.length) return false;

    const range = window.getSelection().getRangeAt(0);

    /**
     * Check for hint
     */
    if (range.startContainer.parentNode.dataset.hint || range.endContainer.parentNode.dataset.hint) return;

    /**
     * Start position of selected item
     */
    let startContainerPosition = parseInt(range.startContainer.parentNode.dataset.position);
    /**
     * End position of selected item
     */
    let endContainerPosition = parseInt(range.endContainer.parentNode.dataset.position);

    if (!range.startContainer.parentNode.dataset.position) {
      if (!range.startContainer.dataset) return;

      startContainerPosition = parseInt(range.startContainer.dataset.position);
    }

    if (!range.endContainer.parentNode.dataset.position) {
      if (!range.endContainer.dataset) return;

      endContainerPosition = parseInt(range.endContainer.dataset.position);
    }

    const startHL = startContainerPosition < endContainerPosition ? startContainerPosition : endContainerPosition;
    const endHL = startContainerPosition < endContainerPosition ? endContainerPosition : startContainerPosition;

    const rangeObj = new Range(startHL, endHL, text, {
      ...this.props,
      ranges: undefined,
    });

    this.props.onTextHighlighted(rangeObj);
  }

  /**
   *
   * @param {*} event
   */
  onMouseUp() {
    this.mouseEvent.bind(this)();
  }

  onMouseDown() {
    // console.log(event)
  }

  onMouseEnter() {
    // console.log(event)
  }

  /**
   * Double click on text
   * @param {*} event
   */
  onDoubleClick() {
    // WARN
    // event.stopPropagation();
    // this.doucleckicked = true;
    // this.mouseEvent.bind(this)();
  }

  /**
   * @param {object} letterGroup All marked sections of text
   * @param {object} range Range of marked section
   * @param {number} textCharIndex The last number of selection
   * @param {function} onMouseOverHighlightedWord
   */
  rangeRenderer(letterGroup, range, textCharIndex, onMouseOverHighlightedWord) {
    if (this.props.rangeRenderer) {
      return this.props.rangeRenderer(letterGroup, range, textCharIndex, onMouseOverHighlightedWord);
    }

    return letterGroup;
  }

  getNode(i, range, text, url, isEmoji) {
    if (url.length) {
      return this.getUrlNode(i, range, url);
    } else if (isEmoji) {
      return this.getEmojiNode(i, range);
    }

    return this.getLetterNode(i, range);
  }

  getRanges() {
    /**
     * Text with nodes
     */
    const newText = [];

    let lastRange;

    /**
     * For all the characters on the text
     */
    for (let textCharIndex = 0; textCharIndex < this.props.text.length; textCharIndex++) {
      /**
       * Get range text
       */
      const range = this.getRange(textCharIndex);

      /**
       * Check characters for URL
       */
      const url = Utils.Checkers.getUrl(textCharIndex, this.props.text);

      /**
       * Check characters for emoji
       */
      const isEmoji = emojiRegex().test(this.props.text[textCharIndex] + this.props.text[textCharIndex + 1]);

      /**
       * Get the current character node
       */
      const node = this.getNode(textCharIndex, range, this.props.text, url, isEmoji);

      /**
       * If the next node is an url one, we fast forward to the end of it
       */
      if (url.length) {
        textCharIndex += url.length - 1;
      } else if (isEmoji) {
        /**
         * Because an emoji is composed of 2 chars
         */
        textCharIndex++;
      }

      if (!range) {
        newText.push(node);
        continue;
      }

      /**
       * If the char is in range
       */
      lastRange = range;

      // console.log(this.props.text[lastRange.start], this.props.text[lastRange.end])

      /**
       * We put the first range node on the array
       */
      const letterGroup = [node];

      /**
       * For all the characters in the highlighted range
       */
      let rangeCharIndex = textCharIndex + 1;

      // if (rangeCharIndex >= parseInt(range.start) && rangeCharIndex <= parseInt(range.end)) {
      //   console.log(this.props.text[parseInt(range.end)])
      // }
      // console.log(textCharIndex, range.start, range.end)

      for (; rangeCharIndex < parseInt(range.end) + 1; rangeCharIndex++) {
        /**
         * Emoji handler
         */
        const isEmoji = emojiRegex().test(`${this.props.text[rangeCharIndex]}${this.props.text[rangeCharIndex + 1]}`);

        if (isEmoji) {
          letterGroup.push(this.getEmojiNode(rangeCharIndex, range));
          // Because an emoji is composed of 2 chars
          rangeCharIndex++;
        } else {
          letterGroup.push(this.getLetterNode(rangeCharIndex, range));
        }

        textCharIndex = rangeCharIndex;
      }

      newText.push(this.rangeRenderer(letterGroup, range, textCharIndex, this.onMouseOverHighlightedWord.bind(this)));
    }

    if (lastRange) {
      // Callback function
      this.onMouseOverHighlightedWord(lastRange, true);
    }

    return newText;
  }

  render() {
    const newText = this.getRanges();

    return (
      <div
        className={styles.block}
        style={this.props.style}
        onMouseUp={this.onMouseUp.bind(this)}
        onMouseDown={this.onMouseDown.bind(this)}
        onMouseEnter={this.onMouseEnter.bind(this)}
        onDoubleClick={this.onDoubleClick.bind(this)}
      >
        {newText}
      </div>
    );
  }
}

export default observer(TextHighlight);
