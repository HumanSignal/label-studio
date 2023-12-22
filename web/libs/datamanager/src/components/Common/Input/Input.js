import React from "react";
import { cn } from "../../../utils/bem";
import "./Input.styl";

const Input = React.forwardRef(({ className, size, ...props }, ref) => {
  const classList = cn("input").mod({ size }).mix(className);

  return <input {...props} className={classList} ref={ref} />;
});

export default Input;
