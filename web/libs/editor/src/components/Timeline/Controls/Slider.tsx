import React, { FC, useEffect, useRef, useState } from 'react';
import { Block, Elem } from '../../../utils/bem';

import './Slider.styl';
import { Info } from './Info';

export interface SliderProps {
  description?: string;
  info?: string;
  max:number;
  min:number;
  value:number;
  step?: number;
  onChange:(e: React.FormEvent<HTMLInputElement>) => void;
}

export const Slider: FC<SliderProps> = ({
  description,
  info,
  max,
  min,
  value,
  step = 1,
  onChange,
}) => {
  const sliderRef = useRef<HTMLDivElement>();
  const [valueError, setValueError] = useState<number|string|undefined>();

  useEffect(() => {
    changeBackgroundSize();
  }, [value]);

  const changeBackgroundSize = () => {
    if (sliderRef.current)
      sliderRef.current.style.backgroundSize = ((value - min) * 100) / (max - min) + '% 100%';
  };

  const handleChangeInputValue = (e: React.FormEvent<HTMLInputElement>) => {
    setValueError(undefined);

    // match only numbers and dot
    const partialFloat = e.currentTarget.value.match(/^[0-9]*\.$/);

    if (partialFloat) {
      setValueError(e.currentTarget.value);
      return;
    }

    const noZero = e.currentTarget.value.match(/^\.[0-9]*$/);
    const normalizedValue = noZero ? '0' + e.currentTarget.value : e.currentTarget.value;

    const newValue = parseFloat(normalizedValue);

    if (isNaN(newValue)) {
      setValueError(e.currentTarget.value);
      return;
    } else if (newValue > max || newValue < min) {
      setValueError(newValue);
    } else {
      onChange(e);
    }
  };

  const renderInput = () => {
    return (
      <Elem name="control">
        <Elem name="info">
          {description}
          {info && <Info text={info} />}
        </Elem>
        <Elem
          name="input"
          tag="input"
          type="text"
          mod={(valueError !== undefined && (typeof valueError === 'string' || valueError > max || valueError < min)) && { error: 'control' }}
          min={min}
          max={max}
          value={valueError === undefined ? value : valueError}
          onChange={handleChangeInputValue}
        />
      </Elem>
    );
  };

  return (
    <Block name="audio-slider">
      <Elem
        ref={sliderRef}
        name="range"
        tag="input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChangeInputValue}
      />
      {renderInput()}
    </Block>
  );
};
