class ResizeObserverFallback {
  observe() {

  }
  unobserve() {

  }
  disconnect() {

  }
}

const ResizeObserver =  window.ResizeObserver ?? ResizeObserverFallback;

export default ResizeObserver;