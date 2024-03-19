import { BoundingBox } from "./BoundingBox";

/* eslint-disable no-unused-expressions */
export class RelationShape {
  params = {};

  _onUpdated = null;

  constructor(params) {
    Object.assign(this.params, params);

    if (this.params.watcher) {
      this._watcher = new this.params.watcher(this.params.root, this.params.element, this.onChanged);
    }
  }

  boundingBox() {
    return BoundingBox.bbox(this.params.element);
  }

  onUpdate(callback) {
    this.onUpdated = callback;
  }

  onChanged = () => {
    this.onUpdated?.();
  };

  destroy() {
    this.onUpdated = null;
  }
}
