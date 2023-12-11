import { CSSProperties, FC } from 'react';
import { Block } from '../../utils/bem';

import './Hint.styl';

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
    <Block
      name="hint"
      tag="sup"
      className={props.className}
      data-copy={props.copy}
      style={props.style}
    >
      {props.children}
    </Block>
  );
};

export default Hint;
