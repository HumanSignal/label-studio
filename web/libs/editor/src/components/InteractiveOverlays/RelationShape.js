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
    // Drop the callback first, so an in-flight debounced update is a no-op,
    // then release the watcher itself. Without this the MutationObserver or the
    // MobX observers it registered stay live for the lifetime of the page.
    this.onUpdated = null;
    this._watcher?.destroy?.();
    this._watcher = null;
  }
}
