import React from "react";

export const ThemeToggle = (props: { className?: string }) =>
  React.createElement("div", { "data-testid": "theme-toggle", ...props }, "ThemeToggle");

export default ThemeToggle;
