import { useEffect, useRef } from 'react';

/**
 * Protects async tasks from causing memory leaks in other effects/callbacks.
 * Wrap any set states within a component with
 * 
 * if (mounted.current) {  ...  }
 */
export const useMounted = () => {
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return mounted;
};

