type TransitionOptions = {
  init?: (element: HTMLElement) => void;
  transition: (element: HTMLElement) => void;
  onStart?: (element: HTMLElement) => void;
  beforeTransition?: (element: HTMLElement) => Promise<void> | void;
  afterTransition?: (element: HTMLElement) => Promise<void> | void;
};

/**
 * Performs a transition on an element
 */
export const aroundTransition = (
  element: HTMLElement,
  { init, transition, onStart, beforeTransition, afterTransition }: TransitionOptions,
) => {
  return new Promise<void>(async (resolve) => {
    init?.(element);

    const onTransitionStarted = () => {
      onStart?.(element);
    };

    const onTransitionEnded = async () => {
      await afterTransition?.(element);

      element.removeEventListener("transitionstart", onTransitionStarted);
      element.removeEventListener("transitionend", onTransitionEnded);
      resolve();
    };

    if (element) {
      element.addEventListener("transitionstart", onTransitionStarted);
      element.addEventListener("transitionend", onTransitionEnded);
    }

    await beforeTransition?.(element);

    setTimeout(() => transition(element), 30);
  });
};
