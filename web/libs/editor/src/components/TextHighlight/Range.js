/**
 * Class for text data with 4 params:
 * start -> int: the index of the character where the range start.
 * end -> int: the index of the character where the range stop.
 * text -> string: the highlighted text.
 * data -> object: extra data (the props of the highlight component)
 */
export default class Range {
  constructor(start, end, text, data = {}) {
    this.start = start;
    this.end = end;
    this.text = text;
    this.data = data;
  }
}
