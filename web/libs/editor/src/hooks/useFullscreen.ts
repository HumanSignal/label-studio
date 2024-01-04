import { useEffect, useRef } from 'react';

const enterFullscreen = (el: HTMLElement) => {
  if ('webkitRequestFullscreen' in el) {
    (el as any).webkitRequestFullscreen();
  } else {
    el.requestFullscreen();
  }
};

const exitFullscreen = () => {
  if ('webkitCancelFullScreen' in document) {
    (document as any).webkitCancelFullScreen();
  } else {
    document.exitFullscreen();
  }
};

const getElement = (): HTMLElement => {
  return (document as any).webkitCurrentFullScreenElement ?? document.fullscreenElement;
};

export interface FullscreenProps {
  onEnterFullscreen?: () => void;
  onExitFullscreen?: () => void;
}

export interface FullscreenHook {
  enter: typeof enterFullscreen;
  exit: typeof exitFullscreen;
  getElement: typeof getElement;
  setHandlers: (options?: FullscreenProps) => void;
}

export const useFullscreen = (
  options: FullscreenProps = {},
  deps: any[],
): FullscreenHook => {
  const handlers = useRef(options);

  useEffect(() => {
    handlers.current = options;
  }, [options, ...(deps ?? [])]);

  useEffect(() => {
    const onChangeFullscreen = () => {
      const fullscreenElement = getElement();

      if (!fullscreenElement) {
        handlers.current.onExitFullscreen?.();
      } else {
        handlers.current.onEnterFullscreen?.();
      }
    };

    const evt = 'onwebkitfullscreenchange' in document
      ? 'webkitfullscreenchange'
      : 'fullscreenchange';

    document.addEventListener(evt, onChangeFullscreen);

    return () => {
      document.removeEventListener(evt, onChangeFullscreen);
    };
  }, []);

  return {
    getElement,
    enter: enterFullscreen,
    exit: exitFullscreen,
    setHandlers(options: FullscreenProps = {}) {
      handlers.current = options;
    },
  };
};
