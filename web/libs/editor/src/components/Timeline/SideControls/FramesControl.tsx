import { FC, MutableRefObject, useMemo, useRef, useState } from 'react';
import { Block } from '../../../utils/bem';
import { clamp } from '../../../utils/utilities';
import { TimelineSideControlProps } from '../Types';
import './FramesControl.styl';

export const FramesControl: FC<TimelineSideControlProps> = ({
  position = 0,
  length = 0,
  onPositionChange,
}) => {
  const [inputMode, setInputMode] = useState(false);
  const duration = useMemo(() => {
    return length - 1;
  }, [length]);

  return (
    <Block name="frames-control" onClick={() => setInputMode(true)}>
      {inputMode ? (
        <FrameInput
          length={duration}
          position={position}
          onChange={(value) => {
            onPositionChange?.(clamp(value, 0, length));
          }}
          onFinishEditing={() => {
            setInputMode(false);
          }}
        />
      ) : (
        <>{clamp(Math.round(position + 1), 1, duration + 1)} <span>of {duration + 1}</span></>
      )}
    </Block>
  );
};

interface FrameInputProps {
  position: number;
  length: number;
  onChange: (value: number) => void;
  onFinishEditing: () => void;
}

const allowedKeys = [
  'ArrowUp',
  'ArrowDown',
  'Backspace',
  'Delete',
  'Enter',
  /[0-9]/,
];

const FrameInput: FC<FrameInputProps> = ({ length, position, onChange, onFinishEditing }) => {
  const input = useRef<HTMLInputElement>() as MutableRefObject<HTMLInputElement>;

  const notifyChange = (value: number) => {
    onChange?.(clamp(value, 1, length));
  };

  return (
    <input
      type="text"
      ref={input}
      defaultValue={position + 1}
      autoFocus
      onFocus={() => input.current?.select()}
      onKeyDown={(e) => {
        const allowedKey = allowedKeys.find(k => (k instanceof RegExp) ? k.test(e.key) : k === e.key);

        if (!allowedKey && !e.metaKey) e.preventDefault();

        const value = parseInt(input.current!.value);
        const step = e.shiftKey ? 10 : 1;

        if (e.key === 'Enter') {
          notifyChange?.(value);
          onFinishEditing?.();
        } else if (e.key === 'Escape') {
          onFinishEditing?.();
        } else if (allowedKey === 'ArrowUp') {
          input.current!.value = (clamp(value + step, 1, length)).toString();
          e.preventDefault();
        } else if (allowedKey === 'ArrowDown') {
          input.current!.value = (clamp(value - step, 1, length)).toString();
          e.preventDefault();
        }
      }}
      onBlur={() => onFinishEditing?.()}
    />
  );
};
