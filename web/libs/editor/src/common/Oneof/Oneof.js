import { Children } from 'react';
import { cloneElement, useMemo } from 'react';

export const Oneof = ({ value, children, className }) => {
  const childList = Children.toArray(children);

  const selectedChild = useMemo(() => {
    return childList.find(c => c.props.case === value) || null;
  }, [childList, value]);

  return selectedChild
    ? cloneElement(selectedChild, {
      ...selectedChild.props,
      className: [className, selectedChild.props.className].join(' '),
    })
    : null;
};
