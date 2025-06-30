import type React from "react";
import { useCallback, useRef, useState } from "react";
import { Block, Elem } from "../../../utils/bem";
import "./DualSlider.scss";

interface DualSliderProps {
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

export const DualSlider: React.FC<DualSliderProps> = ({ min, max, step, value, onChange }) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<"min" | "max" | null>(null);

  const valueToPercentage = useCallback(
    (val: number) => {
      return ((val - min) / (max - min)) * 100;
    },
    [min, max],
  );

  const percentageToValue = useCallback(
    (percentage: number) => {
      const rawValue = (percentage / 100) * (max - min) + min;
      return Math.round(rawValue / step) * step;
    },
    [min, max, step],
  );

  const handleMouseDown = useCallback(
    (handle: "min" | "max") => (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(handle);

      const handleMouseMove = (e: MouseEvent) => {
        if (!sliderRef.current) return;

        const rect = sliderRef.current.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const newValue = percentageToValue(percentage);

        if (handle === "min") {
          const newMin = Math.max(min, Math.min(newValue, value[1] - step));
          if (newMin !== value[0]) {
            onChange([newMin, value[1]]);
          }
        } else {
          const newMax = Math.min(max, Math.max(newValue, value[0] + step));
          if (newMax !== value[1]) {
            onChange([value[0], newMax]);
          }
        }
      };

      const handleMouseUp = () => {
        setIsDragging(null);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [min, max, step, value, onChange, percentageToValue],
  );

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const percentage = ((e.clientX - rect.left) / rect.width) * 100;
      const clickValue = percentageToValue(percentage);

      // Determine which handle is closer
      const distToMin = Math.abs(clickValue - value[0]);
      const distToMax = Math.abs(clickValue - value[1]);

      if (distToMin <= distToMax) {
        const newMin = Math.max(min, Math.min(clickValue, value[1] - step));
        onChange([newMin, value[1]]);
      } else {
        const newMax = Math.min(max, Math.max(clickValue, value[0] + step));
        onChange([value[0], newMax]);
      }
    },
    [min, max, step, value, onChange, percentageToValue, isDragging],
  );

  const minPercentage = valueToPercentage(value[0]);
  const maxPercentage = valueToPercentage(value[1]);

  return (
    <Block name="dual-slider">
      <Elem name="track" onClick={handleTrackClick} ref={sliderRef}>
        <Elem
          name="track-fill"
          style={{
            left: `${minPercentage}%`,
            width: `${maxPercentage - minPercentage}%`,
          }}
        />
        <Elem
          name="handle"
          mod={{ active: isDragging === "min" }}
          style={{ left: `${minPercentage}%` }}
          onMouseDown={handleMouseDown("min")}
        />
        <Elem
          name="handle"
          mod={{ active: isDragging === "max" }}
          style={{ left: `${maxPercentage}%` }}
          onMouseDown={handleMouseDown("max")}
        />
      </Elem>
    </Block>
  );
};
