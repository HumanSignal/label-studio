import { observe } from 'mobx';
import { debounce } from '../../../utils/debounce';

export const createPropertyWatcher = props => {
  return class {
    constructor(root, element, callback) {
      this.root = root;
      this.element = element;
      this.callback = callback;

      this.handleUpdate();
    }

    handleUpdate() {
      this.disposers = this._watchProperties(this.element, props, []);
    }

    onUpdate = debounce(() => {
      this.callback();
    }, 10);

    destroy() {
      this.disposers.forEach(dispose => dispose());
    }

    _watchProperties(element, propsList, disposers) {
      return propsList.reduce((res, property) => {
        if (typeof property !== 'string') {
          Object.keys(property).forEach(propertyName => {
            this._watchProperties(element[propertyName], property[propertyName], disposers);
          });
        } else {
          if (Array.isArray(element)) {
            element.forEach(el => this._watchProperties(el, propsList, disposers));
          } else {
            res.push(observe(element, property, this.onUpdate, true));
          }
        }

        return res;
      }, disposers);
    }
  };
};
