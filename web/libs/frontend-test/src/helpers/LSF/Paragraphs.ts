import { withMedia } from "../utils/media/MediaMixin";
import type { ViewWithMedia } from "../utils/media/types";

class ParagraphsHelper extends withMedia(
  class implements ViewWithMedia {
    get _baseRootSelector() {
      return ".lsf-paragraphs";
    }

    _rootSelector: string;

    constructor(rootSelector: string) {
      this._rootSelector = rootSelector.replace(/^&/, this._baseRootSelector);
    }

    get root() {
      return cy.get(this._rootSelector);
    }

    get mediaElement() {
      return this.root.get("audio[controls]");
    }

    getPhrase(idx: number) {
      return this.root.find(`[data-testid="phrase:${idx}"]`);
    }
    getPhrasePlayButton(idx: number, timeout = 4000) {
      return this.getPhrase(idx).find("button[aria-label='play']", { timeout });
    }
    getPhrasePauseButton(idx: number, timeout = 4000) {
      return this.getPhrase(idx).find("button[aria-label='pause']", { timeout });
    }

    hasPhrasePlaying(idx: number, timeout = 4000) {
      this.getPhrasePauseButton(idx, timeout).should("exist");
    }
    hasNoPhrasePlaying(idx: number, timeout = 4000) {
      this.getPhrasePlayButton(idx, timeout).should("exist");
    }

    selectText(text: string, phraseIdx?: number) {
      const target = phraseIdx !== undefined ? this.getPhrase(phraseIdx) : this.root;

      return target.contains(text).then(($el) => {
        const el = $el[0];
        const textElement = el.childNodes[0];
        const startOffset = el.textContent.indexOf(text);
        const endOffset = startOffset + text.length;
        const document = el.ownerDocument;
        const range = document.createRange();
        range.setStart(textElement, startOffset);
        range.setEnd(textElement, endOffset);
        this._selectRange(range);
      });
    }

    _selectRange(range: Range) {
      const el: HTMLElement = (
        range.commonAncestorContainer.nodeType === Node.TEXT_NODE
          ? range.commonAncestorContainer.parentElement
          : range.commonAncestorContainer
      ) as HTMLElement;
      const elRect = el.getBoundingClientRect();
      const startEdgeRange = range.cloneRange();
      startEdgeRange.setEnd(range.startContainer, range.startOffset);
      const endEdgeRange = range.cloneRange();
      endEdgeRange.setStart(range.endContainer, range.endOffset);
      const startRect = startEdgeRange.getBoundingClientRect();
      const endRect = endEdgeRange.getBoundingClientRect();
      const x = startRect.left - elRect.left;
      const y = startRect.top - elRect.top;
      const x2 = endRect.right - elRect.left;
      const y2 = endRect.bottom - elRect.top;
      const eventOptions = {
        eventConstructor: "MouseEvent",
        buttons: 1,
        force: true,
      };
      cy.wrap(el)
        .trigger("mousedown", x, y, eventOptions)
        .trigger("mousemove", x2, y2, eventOptions)
        .then(() => {
          const document = el.ownerDocument;
          const selection = document.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        })
        .trigger("mouseup", x2, y2, eventOptions);
    }
  },
) {}

const Paragraphs = new ParagraphsHelper("&:eq(0)");
const useParagraphs = (rootSelector: string) => {
  return new ParagraphsHelper(rootSelector);
};

export { Paragraphs, useParagraphs };
