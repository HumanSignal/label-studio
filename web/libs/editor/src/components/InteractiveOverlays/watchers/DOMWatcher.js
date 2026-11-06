export class DOMWatcher {
  constructor(root, element, callback) {
    this.root = root;
    this.element = element.getRegionElement();
    this.callback = callback;

    this.handleUpdate();
  }

  handleResize() {
    window.addEventListener("resize", this.onUpdate);
  }

  handleUpdate() {
    if (!this.element) return;

    this.observer = new MutationObserver(this.onUpdate);

    this.observer.observe(this.element, { attributes: true });
  }

  onUpdate = () => {
    this.callback();
  };

  destroy() {
    window.removeEventListener("resize", this.onUpdate);
    // `handleUpdate` bails out when the region has no DOM element yet,
    // so there is not always an observer to disconnect.
    this.observer?.disconnect();
    this.observer = null;
  }
}
