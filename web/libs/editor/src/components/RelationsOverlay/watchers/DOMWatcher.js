export class DOMWatcher {
  constructor(root, element, callback) {
    this.root = root;
    this.element = element.getRegionElement();
    this.callback = callback;

    this.handleUpdate();
  }

  handleResize() {
    window.addEventListener('resize', this.onUpdate);
  }

  handleUpdate() {
    this.observer = new MutationObserver(this.onUpdate);

    this.observer.observe(this.element, { attributes: true });
  }

  onUpdate = () => {
    this.callback();
  };

  destroy() {
    window.removeEventListener('resize', this.onUpdate);
    this.observer.disconnect();
  }
}
