import { inject, observer } from "mobx-react";
import { useEffect, useState } from "react";
// @ts-ignore - RadioGroup is a .jsx file without types
import { RadioGroup } from "../../Common/RadioGroup/RadioGroup";
import { IconRows3, IconRows4 } from "@humansignal/icons";
import { Tooltip } from "@humansignal/ui";

// Density constants - exported for use in other components
export const DENSITY_STORAGE_KEY = "dm:table:density";
export const DENSITY_COMFORTABLE = "comfortable" as const;
export const DENSITY_COMPACT = "compact" as const;

// Row height values for each density
export const ROW_HEIGHT_COMFORTABLE = 70;
export const ROW_HEIGHT_COMPACT = 50;

export type Density = typeof DENSITY_COMFORTABLE | typeof DENSITY_COMPACT;

interface DensityToggleProps {
  size?: "small" | "medium" | "large";
  onChange?: (density: Density) => void;
  storageKey?: string;
  view?: { type: string };
}

const densityInjector = inject(({ store }: any) => ({
  view: store.currentView,
}));

export const DensityToggle = densityInjector(
  observer(({ size, onChange, storageKey, view, ...rest }: DensityToggleProps) => {
    const key = storageKey ?? DENSITY_STORAGE_KEY;
    const [density, setDensity] = useState<Density>(() => {
      return (localStorage.getItem(key) as Density) ?? DENSITY_COMFORTABLE;
    });

    useEffect(() => {
      localStorage.setItem(key, density);
      onChange?.(density);

      // Notify other components about density change
      window.dispatchEvent(new CustomEvent("dm:density:changed", { detail: density }));
    }, [density, onChange, key]);

    // Hide density toggle when in grid view
    if (view?.type === "grid") {
      return null;
    }

    return (
      <RadioGroup
        size={size}
        value={density}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDensity(e.target.value as Density)}
        {...rest}
        style={{ "--button-padding": "0 var(--spacing-tighter)" } as React.CSSProperties}
        data-testid="density-toggle"
      >
        <Tooltip title="Comfortable density">
          <div>
            <RadioGroup.Button
              value={DENSITY_COMFORTABLE}
              aria-label="Comfortable density"
              data-testid="density-comfortable"
            >
              <IconRows3 />
            </RadioGroup.Button>
          </div>
        </Tooltip>
        <Tooltip title="Compact density">
          <div>
            <RadioGroup.Button value={DENSITY_COMPACT} aria-label="Compact density" data-testid="density-compact">
              <IconRows4 />
            </RadioGroup.Button>
          </div>
        </Tooltip>
      </RadioGroup>
    );
  }),
);
