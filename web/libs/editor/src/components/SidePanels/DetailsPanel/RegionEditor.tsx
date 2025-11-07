import { observe } from "mobx";
import { observer } from "mobx-react";
import { type IAnyType, isLiteralType, isOptionalType, isPrimitiveType, isUnionType, types } from "mobx-state-tree";
import {
  type ChangeEvent,
  type FC,
  type HTMLInputTypeAttribute,
  type InputHTMLAttributes,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { IconPropertyAngle } from "@humansignal/icons";
import { Checkbox, Select } from "@humansignal/ui";
import { cn } from "../../../utils/bem";
import { TimeDurationControl } from "../../TimeDurationControl/TimeDurationControl";
import { TimelineRegionEditor } from "./TimelineRegionEditor";
import "./RegionEditor.scss";
import type { MSTRegion } from "../../../stores/types";

interface RegionEditorProps {
  region: MSTRegion;
}

const getPrimitiveType = (type: IAnyType) => {
  if (isOptionalType(type)) {
    const subtype = (type as any).getSubTypes();

    return isPrimitiveType(subtype) ? subtype.name : null;
  }

  return isPrimitiveType(type) ? (type as any).name : null;
};

const getInputType = (type: any) => {
  const primitive = getPrimitiveType(type);

  switch (primitive) {
    case "number":
      return "number";
    case "string":
      return "text";
    default:
      return "text";
  }
};

const IconMapping = {
  angle: IconPropertyAngle,
};

const RegionEditorComponent: FC<RegionEditorProps> = ({ region }) => {
  const isAudioRegion = region.type === "audioregion";
  const isTimelineRegion = region.type === "timelineregion";
  const Component = isTimelineRegion ? TimelineRegionEditor : isAudioRegion ? AudioRegionProperties : RegionProperties;

  return (
    <div className={cn("region-editor").mod({ disabled: region.isReadOnly() }).toClassName()}>
      <Component region={region} />
    </div>
  );
};

const RegionProperties = ({ region }: RegionEditorProps) => {
  const fields = region.editableFields ?? [];

  return (
    <div className={cn("region-editor").elem("wrapper").toClassName()}>
      {region.editorEnabled &&
        fields.map((field, i) => {
          return (
            <RegionProperty
              key={`${field.property}-${i}`}
              property={field.property}
              label={field.label}
              region={region}
            />
          );
        })}
    </div>
  );
};

const AudioRegionProperties = observer(({ region }: { region: any }) => {
  const changeStartTimeHandler = (value: number) => {
    region.setProperty("start", value);
  };

  const changeEndTimeHandler = (value: number) => {
    region.setProperty("end", value);
  };

  return (
    <div className={cn("region-editor").elem("wrapper-time-control").toClassName()}>
      <TimeDurationControl
        startTime={region.start}
        endTime={region.end}
        minTime={0}
        maxTime={region?._ws_region?.duration}
        isSidepanel={true}
        onChangeStartTime={changeStartTimeHandler}
        onChangeEndTime={changeEndTimeHandler}
        showLabels
        showDuration
      />
    </div>
  );
});

interface RegionPropertyProps {
  property: string;
  label: string;
  region: MSTRegion;
}

const RegionProperty: FC<RegionPropertyProps> = ({ property, label, region }) => {
  const [value, setValue] = useState(region.getProperty(property));

  const propertyType = useMemo(() => {
    return region.getPropertyType(property);
  }, [region, property]);

  const isPrimitive = useMemo(() => {
    return isPrimitiveType(propertyType);
  }, [propertyType]);

  const options = useMemo(() => {
    if (isPrimitive) return null;

    let result: string[] | null = null;
    const isEnum = isUnionType(propertyType);

    if (isEnum) {
      const isOptional = isOptionalType(propertyType) as boolean;
      const valuesList = isOptional ? propertyType.getSubTypes().getSubTypes() : propertyType.getSubTypes();
      const hasOptions = valuesList.some((t: any) => isLiteralType(t) || isPrimitiveType(t));

      result = hasOptions ? (valuesList as any[]).map((t: any) => t.value) : null;
    }

    return result;
  }, [propertyType, isPrimitive]);

  const isBoolean = useMemo(() => {
    if (!isPrimitive) return false;

    const coreType = isOptionalType(propertyType) ? propertyType.getSubTypes() : propertyType;

    return coreType === types.boolean;
  }, [propertyType, isPrimitive]);

  const isString = useMemo(() => {
    if (!isPrimitive) return false;

    const coreType = isOptionalType(propertyType) ? propertyType.getSubTypes() : propertyType;

    return coreType === types.string || coreType[0] === types.string;
  }, [propertyType, isPrimitive]);

  const onChangeHandler = useCallback(
    (value) => {
      if (value !== region.getProperty(property)) {
        try {
          region.setProperty(property, value);
        } catch (err) {
          console.error(err);
        }
      }
    },
    [propertyType, isBoolean],
  );

  useEffect(() => {
    const cancelObserve = observe(region, property, ({ newValue, oldValue }) => {
      if (oldValue.storedValue !== newValue.storedValue) setValue(newValue.storedValue);
    });

    return () => cancelObserve();
  }, [region]);

  return (
    <label className={cn("region-editor").elem("property").mod({ text: isString }).toClassName()}>
      {isBoolean ? (
        <Checkbox
          className={cn("region-editor").elem("input").toClassName()}
          checked={value}
          onChange={(e) => onChangeHandler(e.target.checked)}
        />
      ) : isString ? (
        <RegionInput type="text" value={value} onChange={(v) => onChangeHandler(v)} />
      ) : isPrimitive ? (
        <RegionInput
          type={getInputType(propertyType)}
          step="0.01"
          value={value}
          onChange={(v) => onChangeHandler(Number(v))}
        />
      ) : options ? (
        <Select
          value={value}
          onChange={(val) => onChangeHandler(val)}
          triggerClassName={cn("region-editor").elem("select").toClassName()}
          options={options}
        />
      ) : null}
      <PropertyLabel label={label} />
    </label>
  );
};

interface RegionInputProps extends InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  type: HTMLInputTypeAttribute;
  onChange?: (newValue: any) => void;
}

const RegionInput: FC<RegionInputProps> = ({ onChange: onChangeValue, type, value, step, ...props }) => {
  const [currentValue, setValue] = useState(value);

  const updateValue = useCallback(
    (value, safeValue = true) => {
      const newValue = value;

      setValue(newValue);
      if (safeValue) onChangeValue?.(newValue);
    },
    [onChangeValue, type],
  );

  const onChangeHandler = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      let value: number | string = e.target.value;
      let safeValue = true;

      if (type === "number") {
        if (!value.match(/^([0-9,.]+)$/gi)) {
          safeValue = false;
        }

        if (value.match(/(,|\.)$/)) {
          value = value.replace(/,/, ".");
          safeValue = false;
        }

        if (safeValue) {
          value = Number.parseFloat(value);
        }
      }

      updateValue(value, safeValue);
    },
    [updateValue, type],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (type !== "number") return;

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();

        const step = e.altKey && e.shiftKey ? 0.01 : e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
        let newValue = Number(currentValue);

        if (e.key === "ArrowUp") {
          newValue += step;
        } else {
          newValue -= step;
        }

        updateValue(newValue);
      }
    },
    [currentValue, type, step],
  );

  useEffect(() => {
    updateValue(value);
  }, [value]);

  const Tag = type === "text" ? "textarea" : "input";

  return (
    <Tag
      {...props}
      className={cn("region-editor").elem("input").toClassName()}
      type="text"
      step={step}
      onChange={onChangeHandler}
      onKeyDown={onKeyDown}
      value={currentValue}
      rows={type === "text" ? 3 : undefined}
    />
  );
};

const PropertyLabel: FC<{ label: string }> = ({ label }) => {
  const IconComponent = useMemo(() => {
    if (label.startsWith("icon:")) {
      const iconName = label.split(":")[1] as keyof typeof IconMapping;

      return IconMapping[iconName] ?? null;
    }

    return null;
  }, [label]);

  return (
    <span className={cn("region-editor").elem("text").toClassName()}>{IconComponent ? <IconComponent /> : label}</span>
  );
};

export const RegionEditor = observer(RegionEditorComponent);
