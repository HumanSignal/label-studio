import type React from "react";
import { type FC, useEffect, useRef, useState } from "react";
import { Tooltip } from "@humansignal/ui";
import { IconInfoConfig } from "@humansignal/icons";
import { cn } from "../../../utils/bem";

import "./Slider.scss";

export interface SliderProps {
  description?: string;
  showInput?: boolean;
  info?: string;
  max: number;
  min: number;
  value: number;
  step?: number;
  onChange: (e: React.FormEvent<HTMLInputElement>) => void;
}

export const Slider: FC<SliderProps> = ({
  description,
  info,
  max,
  min,
  value,
  step = 1,
  showInput = true,
  onChange,
}) => {
  const sliderRef = useRef<HTMLDivElement>();
  const [valueError, setValueError] = useState<number | string | undefined>();

  useEffect(() => {
    changeBackgroundSize();
  }, [value]);

  const changeBackgroundSize = () => {
    if (sliderRef.current) sliderRef.current.style.backgroundSize = `${((value - min) * 100) / (max - min)}% 100%`;
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
    const normalizedValue = noZero ? `0${e.currentTarget.value}` : e.currentTarget.value;

    const newValue = Number.parseFloat(normalizedValue);

    if (isNaN(newValue)) {
      setValueError(e.currentTarget.value);
      return;
    }
    if (newValue > max || newValue < min) {
      setValueError(newValue);
    } else {
      onChange(e);
    }
  };

  const renderInput = () => {
    return (
      <div className={cn("audio-slider").elem("control").toClassName()}>
        <div className={cn("audio-slider").elem("info").toClassName()}>
          {description}
          {info && (
            <Tooltip title={info}>
              <IconInfoConfig />
            </Tooltip>
          )}
        </div>
        {showInput && (
          <input
            className={cn("audio-slider")
              .elem("input")
              .mod(
                valueError !== undefined &&
                  (typeof valueError === "string" || valueError > max || valueError < min) && { error: "control" },
              )
              .toClassName()}
            type="text"
            min={min}
            max={max}
            value={valueError === undefined ? value : valueError}
            onChange={handleChangeInputValue}
          />
        )}
      </div>
    );
  };

  return (
    <div className={cn("audio-slider").toClassName()}>
      <input
        ref={sliderRef as any}
        className={cn("audio-slider").elem("range").toClassName()}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChangeInputValue}
      />
      {renderInput()}
    </div>
  );
};
