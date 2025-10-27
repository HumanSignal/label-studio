import { observer } from "mobx-react";
import { useEffect, useState } from "react";
import { RadioGroup } from "../../Common/RadioGroup/RadioGroup";
import { IconRows3, IconRows4 } from "@humansignal/icons";
import { Tooltip } from "@humansignal/ui";

const DENSITY_STORAGE_KEY = "dm:quickview:density";
const DENSITY_COMFORTABLE = "comfortable";
const DENSITY_COMPACT = "compact";

export const DensityToggle = observer(({ size, onChange, storageKey, ...rest }) => {
  const key = storageKey ?? DENSITY_STORAGE_KEY;
  const [density, setDensity] = useState(() => {
    return localStorage.getItem(key) ?? DENSITY_COMFORTABLE;
  });

  useEffect(() => {
    localStorage.setItem(key, density);
    onChange?.(density);
  }, [density, onChange, key]);

  return (
    <RadioGroup
      size={size}
      value={density}
      onChange={(e) => setDensity(e.target.value)}
      {...rest}
      style={{ "--button-padding": "0 var(--spacing-tighter)" }}
    >
      <Tooltip title="Comfortable density">
        <div>
          <RadioGroup.Button value={DENSITY_COMFORTABLE} aria-label="Comfortable density">
            <IconRows3 />
          </RadioGroup.Button>
        </div>
      </Tooltip>
      <Tooltip title="Compact density">
        <div>
          <RadioGroup.Button value={DENSITY_COMPACT} aria-label="Compact density">
            <IconRows4 />
          </RadioGroup.Button>
        </div>
      </Tooltip>
    </RadioGroup>
  );
});
