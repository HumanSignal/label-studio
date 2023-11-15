import React, { FC, useCallback, useEffect, useState } from 'react';
import { Block, Elem } from '../../utils/bem';
import { MaskUtil } from '../../utils/InputMask';

import './TimeBox.styl';

export interface TimerProps {
  sidepanel: boolean;
  value: number;
  readonly?: boolean;
  inverted?: boolean;
  onChange: (value: number) => void;
}

export const TimeBox: FC<TimerProps> = ({
  sidepanel = false,
  value,
  inverted = false,
  readonly = false,
  onChange,
  ...props
}) => {
  const inputRef = React.createRef<HTMLInputElement>();
  const [currentInputTime, setCurrentInputTime] = useState<string | number | undefined>(value);

  useEffect(() => {
    if (inputRef.current) new MaskUtil(inputRef.current, '11:11:11:111',(data: string) => {
      setCurrentInputTime(data);
    });
  }, []);

  useEffect(() => {
    setCurrentInputTime(formatTime(value || 0, true));
  }, [value]);

  const formatTime = useCallback((time: number, input = false): any => {
    const timeDate = new Date(time * 1000).toISOString();
    let formatted = time > 3600
      ? timeDate.substr(11, 8)
      : '00:' + timeDate.substr(14, 5);

    if (input) {
      const isHour = timeDate.substr(11, 2) !== '00';

      formatted = timeDate.substr(isHour ? 11 : 14, isHour ? 12 : 9).replace('.', ':');

      formatted = !isHour ? '00:' + formatted : formatted;
    }

    return formatted;
  }, []);

  const convertTextToTime = (value: string) => {
    const splittedValue = value.split(':').reverse();
    let totalTime = 0;

    if (value.indexOf('_') >= 0) return;

    const calcs = [
      (x: number) => x / 1000,
      (x: number) => x,
      (x: number) => (x * 60),
      (x: number) => (x * 60) * 60,
    ];

    splittedValue.forEach((value, index) => {
      totalTime += calcs[index](parseFloat(value));
    });

    onChange(totalTime);
  };

  const handleBlurInput = (e: React.FormEvent<HTMLInputElement>) => {
    const splittedValue = e.currentTarget.value.split(':');

    splittedValue[0] = splittedValue[0].toString().length === 1 ? `0${splittedValue[0].toString()}` : `${splittedValue[0]}`;

    convertTextToTime(splittedValue.join(':'));
    setCurrentInputTime(formatTime(value || 0, true));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget?.blur?.();
    }
  };

  const renderInputTime = () => {
    return (
      <Elem name={'input-time'}
        maxLength={12}
        tag={'input'}
        ref={inputRef}
        type="text"
        readOnly={readonly}
        value={ currentInputTime }
        onKeyDown={handleKeyDown}
        onChange={() => {}}
        onBlur={handleBlurInput} />
    );
  };

  return (
    <Block name="time-box" mod={{ inverted, sidepanel }} {...props}>
      {renderInputTime()}
    </Block>
  );
};
