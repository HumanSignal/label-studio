import { observer } from "mobx-react";
import type { MSTTimelineRegion } from "../../Timeline/Types";
import styles from "./TimelineRegionEditor.module.css";

export const TimelineRegionEditor = observer(({ region }: { region: MSTTimelineRegion }) => {
  const { start, end } = region.ranges[0];
  const length = region.object.length;

  const changeStartTimeHandler = (value: number) => {
    if (+value === region.ranges[0].start) return;
    region.setRange([+value, region.ranges[0].end]);
  };

  const changeEndTimeHandler = (value: number) => {
    if (+value === region.ranges[0].end) return;
    region.setRange([region.ranges[0].start, +value]);
  };

  return (
    <div className={styles.container}>
      <Field label="Start frame" value={start} onChange={changeStartTimeHandler} region={region} min={1} max={end} />
      <Field label="End frame" value={end} onChange={changeEndTimeHandler} region={region} min={start} max={length} />
      <Field label="Duration" value={end - start + 1} region={region} />
    </div>
  );
});

type FieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  label: string;
  value: number;
  onChange?: (value: number) => void;
  region: any;
};

const Field = ({ label, value: originalValue, onChange: saveValue, region, min, max, ...rest }: FieldProps) => {
  const readonly = !saveValue;

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const onChange = (e) => {
    let value = +e.target.value;
    if (min && value < +min) {
      e.target.value = min;
      value = +min;
    }
    if (max && value > +max) {
      e.target.value = max;
      value = +max;
    }
    saveValue?.(value);
  };

  return (
    <label className={styles.label}>
      <span className={styles.labelText}>{label}</span>
      <input
        className={styles.input}
        // hacky way to update value on region change; `onChange` is not called on every change, so input is still not controlled
        key={originalValue}
        type="number"
        step={1}
        readOnly={readonly}
        onBlur={onChange}
        onClick={onChange} // to handle clicks on +/- buttons
        onKeyDown={onKeyDown}
        // readonly field should be controlled to update value on region change.
        // editable field is not controlled to not validate value on typing.
        {...{ [readonly ? "value" : "defaultValue"]: originalValue }}
        min={min}
        max={max}
        {...rest}
      />
    </label>
  );
};
