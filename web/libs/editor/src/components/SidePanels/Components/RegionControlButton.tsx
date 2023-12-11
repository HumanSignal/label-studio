import { FC } from 'react';
import { Button, ButtonProps } from '../../../common/Button/Button';

export const RegionControlButton: FC<ButtonProps> = ({ children, onClick, ...props }) => {
  return (
    <Button
      {...props}
      onClick={(e) => {
        e.stopPropagation(),
        onClick?.(e);
      }}
      type="text"
      style={{ padding: 0, width: 24, height: 24, ...(props.style ?? {}) }}
    >
      {children}
    </Button>
  );
};
