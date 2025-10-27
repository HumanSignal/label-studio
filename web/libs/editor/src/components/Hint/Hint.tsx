import type { CSSProperties, FC } from "react";
import { cn } from "../../utils/bem";

import "./Hint.scss";

interface HintProps {
  copy?: string;
  style?: CSSProperties;
  className?: string;
}

/**
 * Hint Component
 */
const Hint: FC<HintProps> = (props) => {
  return (
    <sup className={cn("hint").mix(props.className).toClassName()} data-copy={props.copy} style={props.style}>
      {props.children}
    </sup>
  );
};

export default Hint;
