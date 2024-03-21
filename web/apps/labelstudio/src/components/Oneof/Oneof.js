import React, { useMemo } from "react";

export const Oneof = ({ value, children, className }) => {
  const selectedChild = useMemo(() => {
    if (Array.isArray(children)) {
      return children.find((c) => c.props.case === value) || null;
    }
    if (children.props.case === value) {
      return children;
    }
  }, [children, value]);

  return selectedChild
    ? React.cloneElement(selectedChild, {
        ...selectedChild.props,
        className: [className, selectedChild.props.className].join(" "),
      })
    : null;
};
