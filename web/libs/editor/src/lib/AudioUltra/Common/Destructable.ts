export class Destructable {
  private destroyed = false;

  get isDestroyed() {
    return this.destroyed;
  }

  destroy() {
    this.destroyed = true;
    this.destroy = () => null;
  }
}
