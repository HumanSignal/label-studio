class RichTextHelper {
  private get _baseRootSelector() {
    return ".lsf-htx-richtext";
  }

  private _rootSelector: string;

  constructor(rootSelector) {
    this._rootSelector = rootSelector.replace(/^\&/, this._baseRootSelector);
  }

  get root() {
    return cy.get(this._rootSelector);
  }

  get content() {
    return this.root.then(($el) => {
      if ($el[0].tagName === "IFRAME") {
        return cy.wrap($el[0].contentDocument.body);
      }
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
    };
    console.log("el", el);
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

  selectText(text) {
    return this.content.contains(text).then(($el) => {
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
  selectBetweenTexts(startText, endText) {
    return this.content.contains(startText).then(($elA) => {
      this.content.contains(endText).then(($elB) => {
        const elA = $elA[0];
        const elB = $elB[0];
        const textElementA = elA.childNodes[0];
        const textElementB = elB.childNodes[0];
        const startOffset = elA.textContent.indexOf(startText);
        const endOffset = elB.textContent.indexOf(endText) + endText.length;
        const document = elA.ownerDocument;
        const range = document.createRange();
        range.setStart(textElementA, startOffset);
        range.setEnd(textElementB, endOffset);
        this._selectRange(range);
      });
    });
  }
  hasRegionWithText(text) {
    this.content.find(".htx-highlight").contains(text).should("exist");
  }
}

const RichText = new RichTextHelper("&:eq(0)");
const useRichText = (rootSelector: string) => {
  return new RichTextHelper(rootSelector);
};

export { RichText, useRichText };
