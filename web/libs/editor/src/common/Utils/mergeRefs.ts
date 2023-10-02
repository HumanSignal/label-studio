import { MutableRefObject } from 'react';

export default function mergeRefs(...inputRefs: (MutableRefObject<any>|undefined|null)[]) {
  const filteredInputRefs = inputRefs.filter(Boolean) as MutableRefObject<any>[];

  if (filteredInputRefs.length <= 1) {
    return filteredInputRefs[0];
  }

  return (ref: any) => {
    filteredInputRefs.forEach((inputRef: MutableRefObject<any>|((ref: MutableRefObject<any>) => void)) => {
      if (typeof inputRef === 'function') {
        inputRef(ref);
      } else {
        inputRef.current = ref;
      }
    });
  };
}
