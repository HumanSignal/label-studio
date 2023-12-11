import { flatten, isDefined } from '../../../utils/utilities';

// line feed
const LF = '\n';

type DDExtraText = string;

function normalizeText(text: string) {
  return text.replace(/[\n\r]/g, '\\n');
}

class DDTextElement {
  public node: Text;
  public start: number;
  public end: number;
  // array of all characters and dummy placeholders
  public content: string[];
  public path?: string;

  constructor(node: Text, start: number, end: number, content: string[], path?: string) {
    this.node = node;
    this.start = start;
    this.end = end;
    this.content = content;
    this.path = path;
  }

  getContent(start: number, end: number): string[] {
    return this.content.slice(Math.max(start - this.start, 0), Math.min(end - this.start, this.end));
  }

  get text(): string {
    return this.content.join('');
  }

  getText(start: number, end: number): string {
    return this.getContent(start, end).join('');
  }

  createSubtext(start: number, end: number) {
    start = Math.max(this.start, start);
    end = Math.min(this.end, end);

    const { node } = this;
    const newNode = node.cloneNode() as Text;
    const content = this.getContent(start, end);

    if (newNode.textContent) {
      newNode.textContent = newNode.textContent.substring(start - this.start, end - this.start);
    }

    return new DDTextElement(newNode, start, end, content);
  }

  wrapWithSpan() {
    const { node, start, end } = this;
    const doc = node.ownerDocument;
    const parent = node.parentNode as Node;
    const dummyReplacer = doc.createTextNode('');
    const span = doc.createElement('span');

    parent?.replaceChild(dummyReplacer, node);
    span.appendChild(node);
    parent?.replaceChild(span, dummyReplacer);

    const spanElement = new DDSpanElement(span, start, end);

    spanElement.children.push(this);

    return spanElement;
  }

  createSpanElements(start: number, end: number): Array<DDSpanElement | DDTextElement> {
    const { node } = this;
    const doc = node.ownerDocument;
    const parent = node.parentNode as Node;
    const fragment = doc.createDocumentFragment();
    const dummyReplacer = doc.createTextNode('');
    const elements = [];

    if (start > this.start) {
      elements.push(this.createSubtext(this.start, start));
    }

    const spanElement = this.createSubtext(start, end).wrapWithSpan();

    elements.push(spanElement);

    if (end < this.end) {
      elements.push(this.createSubtext(end, this.end));
    }
    elements.forEach(el => {
      fragment.appendChild(el.node);
    });
    parent.replaceChild(dummyReplacer, node);
    parent.replaceChild(fragment, dummyReplacer);

    return elements;
  }

  removeNode() {
    const { node } = this;
    const parent = node.parentNode as Node;

    parent.removeChild(node);
  }

  mergeWith(elements: DDTextElement[]) {
    this.node.data += elements.map(el => el.node.data).join('');
    this.end = elements[elements.length - 1].end;
    this.content.push(...elements.map(el => el.content).flat());
  }
}

class DDBlock {
  public start: number;
  public end: number;
  public children: Array<DDSpanElement | DDTextElement> = [];

  constructor(start: number, end: number = start) {
    this.start = start;
    this.end = end;
  }

  findTextElement(pos: number, avoid: 'start' | 'end' = 'start'): DDTextElement | undefined {
    const el = this.children.find(child => (child.start <= pos && child.end >= pos && child[avoid] !== pos));

    if (el instanceof DDSpanElement) {
      return el.findTextElement(pos, avoid);
    } else if (el instanceof DDTextElement) {
      return el;
    }
  }

  findElementByNode(node: Node): DDTextElement | DDSpanElement | undefined {
    for (const el of this.children) {
      if (el.node === node) {
        return el;
      }
      if (el instanceof DDSpanElement) {
        const res = el.findElementByNode(node);

        if (res) {
          return res;
        }
      }
    }
  }

  getText(start: number, end: number) {
    const texts: string[] = [];

    this.children.forEach(el => {
      if (el.end > start && el.start < end) {
        texts.push(el.getText(start, end));
      }
    });
    return texts.join('');
  }

  wrapElementsWithSpan(elements: Array<DDSpanElement | DDTextElement>) {
    const firstElement = elements[0];
    const lastElement = elements[elements.length - 1];
    const { node } = firstElement;
    const doc = node.ownerDocument;
    const parent = node.parentNode as Node;
    const dummyReplacer = doc.createTextNode('');
    const span = doc.createElement('span');

    parent.replaceChild(dummyReplacer, firstElement.node);
    elements.forEach(el => {
      span.appendChild(el.node);
    });
    parent.replaceChild(span, dummyReplacer);

    const spanElement = new DDSpanElement(span, firstElement.start, lastElement.end);

    spanElement.children.push(...elements);
    return spanElement;
  }

  createSpans(start: number, end: number): Array<HTMLSpanElement> {
    const spans: HTMLSpanElement[] = [];
    const children = [];
    let wrappableNodes = [];

    for (const node of this.children) {
      const isTextNode = node instanceof DDTextElement;

      if (node.start >= start && node.end <= end) {
        wrappableNodes.push(node);
        continue;
      }
      if (wrappableNodes.length) {
        const spanElement = this.wrapElementsWithSpan(wrappableNodes);

        children.push(spanElement);
        spans.push(spanElement.node);
        wrappableNodes = [];
      }
      if (start >= node.start && start < node.end || end > node.start && end <= node.end) {
        if (isTextNode) {
          const elements = node.createSpanElements(start, end);

          children.push(...elements);
          spans.push(
            ...elements
              .filter(el => el instanceof DDSpanElement)
              .map(el => el.node as HTMLSpanElement),
          );
        } else {
          children.push(node);
          spans.push(...node.createSpans(start, end));
        }
      } else {
        children.push(node);
      }
    }
    if (wrappableNodes.length) {
      const spanElement = this.wrapElementsWithSpan(wrappableNodes);

      children.push(spanElement);
      spans.push(spanElement.node);
    }

    this.children = children;
    return spans;
  }

  removeSpans(spans: HTMLSpanElement[]) {
    for (let i = this.children.length - 1; i >= 0; i--) {
      const el = this.children[i];

      if (el instanceof DDSpanElement) {
        if (spans.includes(el.node)) {
          el.removeNode();

          this.children.splice(i, 1, ...el.children);
        } else {
          el.removeSpans(spans);
        }
      }
    }

    let stack: DDTextElement[] = [];
    const result = [];
    const checkStack = () => {
      if (stack.length > 0) {
        const mainElement = stack[0];

        if (stack.length > 1) {
          const extraElements = stack.slice(1);

          mainElement.mergeWith(extraElements);
          extraElements.forEach(el => el.removeNode());
        }

        result.push(mainElement);
        stack = [];
      }
    };

    for (const el of this.children) {
      if (el instanceof DDTextElement && (stack.length === 0 || stack[stack.length - 1].node.nextSibling === el.node)) {
        stack.push(el);
      } else {
        checkStack();
        result.push(el);
      }
    }
    checkStack();
    this.children = result;
  }
}

class DDSpanElement extends DDBlock {
  public node: HTMLSpanElement;

  constructor(node: HTMLSpanElement, start: number, end: number) {
    super(start, end);
    this.node = node;
  }

  removeNode() {
    const { node } = this;
    const doc = node.ownerDocument;
    const parent = node.parentNode as Node;
    const fragment = doc.createDocumentFragment();

    while (node.firstChild) {
      fragment.appendChild(node.firstChild);
    }

    parent.replaceChild(fragment, node);
  }
}

class DDDynamicBlock extends DDBlock {
  public path: string;

  constructor(start: number, path: string) {
    super(start);
    this.path = path;
  }

  addTextNode(textNode: Text, start: number, end: number, content: string[], path: string) {
    this.children.push(new DDTextElement(textNode, start, end, content, path));
    this.end = end;
  }
}

class DDStaticElement {
  public node: HTMLElement;
  public start: number;
  public path: string;

  constructor(node: HTMLElement, start: number, path: string) {
    this.node = node;
    this.start = start;
    this.path = path;
  }

  getText() {
    return '';
  }
}

class DomData {
  private elements: Array<DDStaticElement | DDDynamicBlock | DDExtraText> = [];
  private endPos: number;
  private displayedText = '';
  private displayedTextPos = 0;

  constructor() {
    this.endPos = 0;
  }

  createDynamicBlock(path: string) {
    const { endPos } = this;

    const dynamicBlock = new DDDynamicBlock(endPos, path);

    this.elements.push(dynamicBlock);
    return dynamicBlock;
  }

  setDisplayedText(displayedText: string) {
    this.displayedText = displayedText;
  }

  addStaticElement(currentNode: HTMLElement, path: Path) {
    this.elements.push(new DDStaticElement(currentNode, this.endPos, path.toString()));
  }

  addExtraText(text: DDExtraText) {
    let lastIdxOfTextBlock = this.elements.length - 1;

    while (!(this.elements[lastIdxOfTextBlock] instanceof DDDynamicBlock) && lastIdxOfTextBlock > -1) {
      --lastIdxOfTextBlock;
    }
    this.elements.splice(lastIdxOfTextBlock + 1, 0, normalizeText(text));
  }

  findProjectionOnDisplayedText(text: string) {
    const { displayedText } = this;
    let fromIdx = this.displayedTextPos;
    const contentParts = [];

    while (displayedText[fromIdx] === LF) {
      fromIdx++;
    }
    let toIdx = fromIdx;

    for (const char of text) {
      if (displayedText[toIdx] === char || (displayedText[toIdx] === ' ' && char === LF)) {
        contentParts.push(displayedText[toIdx]);
        toIdx++;
      } else {
        contentParts.push('');
      }
    }
    return {
      fromIdx,
      toIdx,
      content: contentParts.map(parts => {
        if (parts) {
          return [...parts];
        }
        return parts;
      }).flat(),
    };
  }

  addTextElement(textNode: Text, path: Path) {
    const { displayedText } = this;
    const text: string = textNode.textContent as string;
    let pos = displayedText.indexOf(text, this.displayedTextPos);
    let content = [...(text)];
    const contentLength = content.length;
    let displayedTextLength = text.length;

    if (pos === -1) {
      // text doesn't match any parts of displayedText
      // that means that it contains some \n or other symbols that are trimmed by browser

      // calc the offsets of the part of displayedText that matches the text in terms of displayed symbols
      const { fromIdx, toIdx, content: newContent } = this.findProjectionOnDisplayedText(text);

      pos = fromIdx;
      displayedTextLength = toIdx - fromIdx;
      // fill content with dummies for not displayable symbols
      content = newContent;
    }

    if (pos !== this.displayedTextPos) {
      this.addExtraText(this.displayedText.substring(this.displayedTextPos, pos));
      this.displayedTextPos = pos;
    }
    const dynamicBlock = this.createDynamicBlock(path.toString());

    dynamicBlock.addTextNode(textNode, this.endPos, this.endPos + contentLength, content, path.toString());
    this.endPos += contentLength;
    this.displayedTextPos += displayedTextLength;
  }

  // That's mostly for processing html representation of a simple text,
  // but historically we calculated this as one symbol even in html,
  // so we should keep it here anyway
  addBR() {
    this.endPos += 1;
  }

  findTextElement(pos: number, avoid: 'start' | 'end' = 'start'): DDTextElement | undefined {
    return this.findTextBlock(pos, avoid)?.findTextElement(pos, avoid);
  }

  findElementByPath(path: string) {
    for (const el of this.elements) {
      if (typeof el !== 'string' && el.path === path) {
        return el;
      }
    }
    return undefined;
  }

  findElementByNode(node: Node) {
    for (const el of this.elements) {
      if (el instanceof DDStaticElement) {
        if (el.node === node) {
          return el;
        }
      } else if (el instanceof DDDynamicBlock) {
        const res = el.findElementByNode(node);

        if (res) {
          return res;
        }
      }
    }
    return void 0;
  }

  findTextBlock(pos: number, avoid: 'start' | 'end' = 'start'): DDDynamicBlock | undefined {
    const block = this.elements.find(el => (el instanceof DDDynamicBlock) && el.start <= pos && el.end >= pos && el[avoid] !== pos);

    if (isDefined(block)) {
      return block as DDDynamicBlock;
    }
    return block;
  }

  indexOfTextBlock(pos: number, avoid: 'start' | 'end' = 'start'): number {
    return this.elements.findIndex(el => (el instanceof DDDynamicBlock) && el.start <= pos && el.end >= pos && el[avoid] !== pos);
  }

  getText(start: number, end: number) {
    const startIdx = this.indexOfTextBlock(start, 'end');
    const endIdx = this.indexOfTextBlock(end, 'start');

    return this.elements.slice(startIdx, endIdx + 1).map(el => {
      if (typeof el !== 'string') {
        return el.getText(start, end);
      }
      return el;
    }).join('');
  }

  collectBlocks(start: number, end: number) {
    const startIdx = this.indexOfTextBlock(start, 'end');
    const endIdx = Math.max(this.indexOfTextBlock(end, 'start'), startIdx);
    const blocks: DDDynamicBlock[] = this.elements.slice(startIdx, endIdx + 1).filter(el => el instanceof DDDynamicBlock) as DDDynamicBlock[];

    return blocks;
  }

  createSpans(start: number, end: number) {
    if (end < start) {
      //collapse range
      end = start;
    }
    const blocks = this.collectBlocks(start, end);

    return flatten(blocks.map(block => block.createSpans(start, end)));
  }

  removeSpans(spans: HTMLSpanElement[], start: number, end: number) {
    const blocks = this.collectBlocks(start, end);

    for (const block of blocks) {
      block.removeSpans(spans);
    }
  }

  destroy() {
    this.elements = [];
  }
}

class Path {
  private readonly segments: Array<[string, number]> = [];
  private readonly counters: Array<{ [key: string]: number }> = [];

  get currentSegment() {
    return this.segments[this.segments.length - 1];
  }

  get currentCounters() {
    return this.counters[this.counters.length - 1];
  }

  getSegmentName(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return 'text()';
    }
    return node.nodeName.toLowerCase();
  }

  into(node: Node) {
    const segmentName = this.getSegmentName(node);

    this.segments.push([segmentName, 1]);
    this.counters.push({ [segmentName]: 1 });
  }

  next(node: Node) {
    const segmentName = this.getSegmentName(node);

    if (!this.currentCounters[segmentName]) {
      this.currentCounters[segmentName] = 0;
    }
    this.currentSegment[0] = segmentName;
    this.currentSegment[1] = ++this.currentCounters[segmentName];
  }

  outOf() {
    this.segments.pop();
    this.counters.pop();
  }

  toString() {
    return '/' + this.segments.map(seg => `${seg[0]}[${seg[1]}]`).join('/');
  }
}

export default class DomManager {
  private readonly container: HTMLDivElement | HTMLIFrameElement;
  private readonly root: HTMLBodyElement | HTMLDivElement;
  private readonly doc: Document;
  private readonly view: Window;
  private domData: DomData;
  private readonly fragment: DocumentFragment;
  private readonly styleTags: { [key: string]: HTMLStyleElement };
  private walker: null | TreeWalker = null;
  private currentPath: Path = new Path();

  constructor(container: HTMLDivElement | HTMLIFrameElement) {
    this.container = container;
    if (container instanceof HTMLIFrameElement) {
      const iframe: HTMLIFrameElement = this.container as HTMLIFrameElement;
      const doc: Document = iframe.contentDocument as Document;

      this.root = doc.body as HTMLBodyElement;
    } else {
      this.root = container;
    }
    this.doc = this.root.ownerDocument;
    this.view = this.doc.defaultView as Window;
    this.domData = new DomData();
    this.fragment = document.createDocumentFragment();
    this.styleTags = {};

    this.initDataMap();
  }

  nextStep(isBackPropagation = false): Node | null {
    const walker = this.walker as TreeWalker;
    const currentPath = this.currentPath;
    let nextNode;

    if (!isBackPropagation) {
      nextNode = walker.firstChild();

      if (nextNode) {
        currentPath.into(nextNode);
        return nextNode;
      }
    }

    nextNode = walker.nextSibling();
    if (nextNode) {
      currentPath.next(nextNode);
      return nextNode;
    }

    nextNode = walker.parentNode();
    currentPath.outOf();
    if (nextNode) {
      return this.nextStep(true);
    }

    return nextNode;
  }

  initDataMap() {
    const { doc, root, domData } = this;
    const walker: TreeWalker = this.walker = doc.createTreeWalker(root, NodeFilter.SHOW_ALL);
    let currentNode: Node | null;

    this.currentPath = new Path();
    currentNode = walker.currentNode;
    domData.setDisplayedText(this.collectText());

    while (currentNode) {
      const isText = currentNode.nodeType === Node.TEXT_NODE;
      const isBR = currentNode.nodeName === 'BR';

      if (isText) {
        domData.addTextElement(currentNode as Text, this.currentPath);
      } else if (isBR) {
        domData.addBR();
      } else {
        domData.addStaticElement(currentNode as HTMLElement, this.currentPath);
      }

      currentNode = this.nextStep();
    }

    this.walker = null;
  }

  collectText() {
    const { root, view } = this;
    const selection: Selection = view.getSelection() as Selection;
    const range: Range = new Range();
    const lastRanges = [];

    // save previous selection
    for (let idx = 0; idx < selection.rangeCount; idx++) {
      lastRanges.push(selection.getRangeAt(idx));
    }

    range.setStartBefore(root);
    range.setEndAfter(root);

    selection.removeAllRanges();
    selection.addRange(range);
    const text = String(selection);

    selection.removeAllRanges();

    // restore previous selection
    for (const range of lastRanges) {
      selection.addRange(range);
    }

    // Dirty hack for restoring active state of some elements (in our case it's CodeMirror editor)
    // @todo Find a better way to reanimate CodeMirror after Selection manipulations
    if (document.activeElement) {
      const el = document.activeElement as HTMLElement;

      el.blur?.();
      el.focus?.();
    }

    return text;
  }

  createRange(start: number, end: number) {
    const startElement = this.domData.findTextElement(start, 'end');
    const endElement = this.domData.findTextElement(end, 'start');

    if (startElement && endElement) {
      const { doc } = this;
      const range = doc.createRange();

      range.setStart(startElement.node, start - startElement.start);
      range.setEnd(endElement.node, end - endElement.start);

      return range;
    }
    return undefined;
  }

  relativeOffsetsToGlobalOffsets(start: string, startOffset: number, end: string, endOffset: number) {
    const startEl = this.domData.findElementByPath(start);
    const endEl = this.domData.findElementByPath(end);

    if (!startEl || !endEl) {
      return undefined;
    }

    return [startOffset + startEl.start, endOffset + endEl.start];
  }

  globalOffsetsToRelativeOffsets(start: number, end: number) {
    const startElement = this.domData.findTextBlock(start, 'end');
    const endElement = this.domData.findTextBlock(end, 'start');

    if (startElement && endElement) {

      return {
        start: startElement.path,
        startOffset: start - startElement.start,
        end: endElement.path,
        endOffset: end - endElement.start,
      };
    }

    return undefined;
  }

  rangeToGlobalOffset(range: Range) {
    const startEl = this.domData.findElementByNode(range.startContainer);
    const endEl = this.domData.findElementByNode(range.endContainer);

    if (!startEl || !endEl) {
      return undefined;
    }

    return [range.startOffset + startEl.start, range.endOffset + endEl.start];
  }

  getText(start: number, end: number) {
    return this.domData.getText(start, end);
  }

  createSpans(start: number, end: number) {
    return this.domData.createSpans(start, end);
  }

  removeSpans(spans: HTMLSpanElement[], start: number, end: number) {
    return this.domData.removeSpans(spans, start, end);
  }

  setStyles(styleMap: { [key: string]: string }) {
    const { styleTags } = this;

    for (const [id, styleText] of Object.entries(styleMap)) {
      let styleTag = styleTags[id];

      if (!styleTag) {
        styleTags[id] = styleTag = this.doc.createElement('style');
        styleTag.id = `highlight-${id}`;
        this.doc.head.appendChild(styleTag);
      }
      styleTag.textContent = styleText;
    }
  }

  removeStyles(ids: string[] | string) {
    const { styleTags } = this;

    if (!Array.isArray(ids)) {
      ids = [ids];
    }
    for (const id of ids) {
      const styleTag = styleTags[id];

      if (styleTag) {
        this.doc.head.removeChild(styleTag);

        delete styleTags[id];
      }
    }
  }

  destroy() {
    this.removeStyles(Object.keys(this.styleTags));
    this.domData.destroy();
    this.domData = new DomData();
  }
}
