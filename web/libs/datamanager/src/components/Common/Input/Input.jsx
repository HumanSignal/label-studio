import React from "react";
import { clsx } from "clsx";
import { cn } from "../../../utils/bem";
import "./Input.prefix.css";

const Input = React.forwardRef(({ className, size, rawClassName, ...props }, ref) => {
  const classList = clsx(cn("input-dm").mod({ size }).mix(className).toString(), rawClassName);

  return <input {...props} className={classList} ref={ref} />;
});

export default Input;
