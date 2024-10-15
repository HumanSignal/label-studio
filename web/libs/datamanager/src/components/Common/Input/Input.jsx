import React from "react";
import { cn } from "../../../utils/bem";
import "./Input.scss";

const Input = React.forwardRef(({ className, size, ...props }, ref) => {
  const classList = cn("input-dm").mod({ size }).mix(className);

  return <input {...props} className={classList} ref={ref} />;
});

export default Input;
