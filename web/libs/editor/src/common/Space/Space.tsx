import React, { CSSProperties, FC } from 'react';
import { BemWithSpecifiContext } from '../../utils/bem';
import './Space.styl';

const { Block } = BemWithSpecifiContext();

export interface SpaceProps {
  direction?: 'horizontal' | 'vertical';
  size?: 'small' | 'medium' | 'large' | 'none';
  style?: CSSProperties;
  spread?: boolean;
  stretch?: boolean;
  align?: 'start' | 'end';
  collapsed?: boolean;
  truncated?: boolean;
  className?: string;
}

export const Space: FC<SpaceProps> = ({
  direction = 'horizontal',
  size,
  className,
  style,
  children,
  spread,
  stretch,
  align,
  collapsed,
  truncated,
  ...rest
}) => {
  return (
    <Block name="space" mod={{ direction, size, spread, stretch, align, collapsed, truncated }} mix={className} style={style} {...rest}>
      {children}
    </Block>
  );
};
