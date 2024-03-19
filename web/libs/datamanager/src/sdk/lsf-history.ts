type LabelStudio = any;

export class LSFHistory {
  history: Array<{ taskID: number; annotationID: number }> = [];

  lsf: LabelStudio = null;

  current = -1;

  callback?: () => void;

  constructor(lsf: LabelStudio) {
    this.lsf = lsf;
  }

  add(taskID: number, annotationID: number) {
    this.history.push({ taskID, annotationID });
    this.current = this.length;

    if (this.callback) this.callback();
  }

  onChange(callback: () => void) {
    this.callback = callback;
  }

  get isFirst() {
    return this.current === 0;
  }

  get isLast() {
    return this.current === this.history.length;
  }

  get canGoBack() {
    return this.length > 0 && !this.isFirst;
  }

  get canGoForward() {
    return this.length > 0 && !this.isLast;
  }

  get length() {
    return this.history.length;
  }

  async goBackward() {
    this.current -= 1;
    await this.load();
  }

  async goForward() {
    this.current += 1;
    await this.load();
  }

  private async load() {
    const index = this.current;

    if (index >= 0 && index < this.length) {
      const { taskID, annotationID } = this.history[index];

      await this.lsf.loadTask(taskID, annotationID);
      this.current = index;
    } else {
      await this.lsf.loadNextTask();
    }

    if (this.callback) this.callback();
  }
}
