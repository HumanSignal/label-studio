import { observe } from "mobx";
import { debounce } from "@humansignal/core/lib/utils/debounce";

export const createPropertyWatcher = (props) => {
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
      this.onUpdate.cancel?.();
      // Watchers are disposed while the annotation is torn down, so an observed
      // node can already be dead by the time its disposer runs.
      this.disposers?.forEach((dispose) => {
        try {
          dispose();
        } catch (_err) {
          // already gone along with its node
        }
      });
      this.disposers = [];
    }

    _watchProperties(element, propsList, disposers) {
      // Arrays are handled before the property loop: doing it inside would walk
      // the whole `propsList` once per property, registering every observer
      // `propsList.length` times over.
      if (Array.isArray(element)) {
        // Watch the array itself too, so items added or removed after the
        // watcher was built (polygon points, for one) still trigger an update.
        disposers.push(observe(element, this.onUpdate));
        element.forEach((el) => this._watchProperties(el, propsList, disposers));

        return disposers;
      }

      return propsList.reduce((res, property) => {
        if (typeof property !== "string") {
          Object.keys(property).forEach((propertyName) => {
            this._watchProperties(element[propertyName], property[propertyName], disposers);
          });
        } else {
          res.push(observe(element, property, this.onUpdate, true));
        }

        return res;
      }, disposers);
    }
  };
};
