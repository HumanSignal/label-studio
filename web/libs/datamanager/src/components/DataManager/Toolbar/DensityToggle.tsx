import { inject, observer } from "mobx-react";
import { useEffect, useState } from "react";
import { IconRows3, IconRows4 } from "@humansignal/icons";
import { SegmentedControl, type ControlSize } from "@humansignal/ui";

// Density constants - exported for use in other components
export const DENSITY_STORAGE_KEY = "dm:table:density";
export const DENSITY_COMFORTABLE = "comfortable" as const;
export const DENSITY_COMPACT = "compact" as const;

// Row height values for each density
export const ROW_HEIGHT_COMFORTABLE = 70;
export const ROW_HEIGHT_COMPACT = 50;

export type Density = typeof DENSITY_COMFORTABLE | typeof DENSITY_COMPACT;

interface DensityToggleProps {
  size?: ControlSize;
  "data-testid"?: string;
  onChange?: (density: Density) => void;
  storageKey?: string;
  view?: { type: string };
}

const densityInjector = inject(({ store }: any) => ({
  view: store.currentView,
}));

export const DensityToggle = densityInjector(
  observer(({ size, onChange, storageKey, view, "data-testid": dataTestId }: DensityToggleProps) => {
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
      <SegmentedControl
        size={size}
        aria-label="Row density"
        data-testid={dataTestId ?? "density-toggle"}
        selectedOption={density}
        onChange={(value) => setDensity(value as Density)}
        options={[
          {
            value: DENSITY_COMFORTABLE,
            label: <IconRows3 />,
            tooltip: "Comfortable density",
            "data-testid": "density-comfortable",
          },
          {
            value: DENSITY_COMPACT,
            label: <IconRows4 />,
            tooltip: "Compact density",
            "data-testid": "density-compact",
          },
        ]}
      />
    );
  }),
);
