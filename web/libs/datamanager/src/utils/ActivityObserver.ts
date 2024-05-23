export class ActivityObserver {
  active = window.navigator.onLine && !document.hidden;

  constructor() {
    window.addEventListener("online", this.handler);
    window.addEventListener("offline", this.handler);
    document.addEventListener("visibilitychange", this.handler);
  }

  destroy() {
    window.removeEventListener("online", this.handler);
    window.removeEventListener("offline", this.handler);
    document.removeEventListener("visibilitychange", this.handler);
  }

  private handler = () => {
    this.active = window.navigator.onLine && !document.hidden;
  };
}
