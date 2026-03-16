import React from "react";
import { cn } from "../../utils/bem";
import "./Icon.prefix.css";

export const Icon = React.forwardRef(({ icon, ...props }, ref) => {
  return (
    <span ref={ref} className={cn("icon").toClassName()}>
      {React.createElement(icon, props)}
    </span>
  );
});
