import React from "react";

/**
 * React hook to detect if user prefers reduced motion (for accessibility)
 */
export function usePrefersReducedMotion() {
  const [prefers, setPrefers] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefers(mq.matches);
    const handler = () => setPrefers(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return prefers;
}

/**
 * React hook to run a callback at a random interval between minDelay and maxDelay (ms)
 */
export function useRandomInterval(callback: () => void, minDelay: number | null, maxDelay: number | null) {
  React.useEffect(() => {
    if (minDelay === null || maxDelay === null) return;
    let timeoutId: number;
    let isActive = true;
    const run = () => {
      if (!isActive) return;
      const next = Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay);
      timeoutId = window.setTimeout(() => {
        callback();
        run();
      }, next);
    };
    run();
    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [minDelay, maxDelay, callback]);
}
