import { observe } from 'mobx';
import { debounce } from '../../../utils/debounce';

export class EllipseWatcher {
  constructor(root, element, callback) {
    this.root = root;
    this.element = element;
    this.callback = callback;

    this.handleUpdate();
  }

  handleUpdate() {
    this.disposers = ['x', 'y', 'radiusX', 'radiusY', 'rotation'].map(property => {
      return observe(this.element, property, this.onUpdate, true);
    });
  }

  onUpdate = debounce(() => {
    this.callback();
  }, 10);

  destroy() {
    this.disposers.forEach(dispose => dispose());
  }
}
