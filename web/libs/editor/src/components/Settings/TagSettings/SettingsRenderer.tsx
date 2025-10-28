import { Input } from "antd";
import { Checkbox } from "@humansignal/ui";
import { observer } from "mobx-react";
import type { FC } from "react";
import type { SettingsProperties, SettingsProperty } from "../../../core/settings/types";
import { cn } from "../../../utils/bem";
import { isFF } from "../../../utils/feature-flags";

const SettingsRendererPure: FC<{ store: any; settings: SettingsProperties }> = ({ store, settings }) => {
  return (
    <div className={cn("settings").toClassName()}>
      {Object.entries(settings).map(([key, value]) => {
        return value.ff && !isFF(value.ff) ? null : <SettingsField key={key} name={key} store={store} value={value} />;
      })}
    </div>
  );
};

const SettingsField: FC<{
  store: any;
  name: string;
  value: SettingsProperty;
}> = observer(({ store, name, value }) => {
  const handler = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (value.onChangeEvent) {
      value.onChangeEvent(e);
    } else if (value.type === "boolean") {
      store.settings.toggleProperty(name);
    } else {
      const newValue = value.type === "number" ? Number(e.target.value) : e.target.value;

      store.settings.setProperty(name, newValue);
    }
  };

  const props: Record<string, any> = {
    onChange: handler,
  };

  if (value.type === "boolean") {
    props.checked = store.settings[name];
  }

  if (value.type !== "boolean") {
    props.type = value.type;
    props.value = store.settings[name];
    props.placeholder = value.description;
  }

  if (value.type === "number") {
    props.step = value.step;
    props.min = value.min;
    props.max = value.max;
  }

  return (
    <div className={cn("settings").elem("field").toClassName()} key={name}>
      {value.type === "boolean" ? (
        <Checkbox {...props}>{value.description}</Checkbox>
      ) : (
        <label>
          {value.description}
          <Input {...props} />
        </label>
      )}
    </div>
  );
});

export const SettingsRenderer = observer(SettingsRendererPure);
