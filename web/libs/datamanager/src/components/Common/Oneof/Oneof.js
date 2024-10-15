import { cloneElement, useMemo } from "react";

const compareCase = (value, caseValue) => {
  if (Array.isArray(caseValue)) {
    return caseValue.includes(value);
  }
  return value === caseValue;
};

export const Oneof = ({ value, children, className }) => {
  const selectedChild = useMemo(() => {
    if (Array.isArray(children)) {
      return children.find((c) => compareCase(value, c.props.case)) || null;
    }
    if (compareCase(value, children.props.case)) {
      return children;
    }
  }, [children, value]);

  return selectedChild
    ? cloneElement(selectedChild, {
        ...selectedChild.props,
        className: [className, selectedChild.props.className].join(" "),
      })
    : null;
};
