import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import registry from "../../components.manifest.json";
import { DateRangePickerTrigger } from "../lib/date-range-picker/date-range-picker-trigger";
import { SearchInput } from "../lib/search-input/search-input";
import { SegmentedControl } from "../lib/segmented-control/segmented-control";
import { TextArea } from "../lib/text-area/text-area";
import { CONTROL_SIZE_NAMES, CONTROL_SIZES } from "./control-sizes";

const OPTIONS = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
];

const SIZED = {
  SegmentedControl: (size?: (typeof CONTROL_SIZE_NAMES)[number]) => (
    <SegmentedControl size={size} selectedOption="a" options={OPTIONS} />
  ),
  SearchInput: (size?: (typeof CONTROL_SIZE_NAMES)[number]) => <SearchInput size={size} aria-label="Search" />,
  TextArea: (size?: (typeof CONTROL_SIZE_NAMES)[number]) => <TextArea size={size} aria-label="Notes" />,
  DateRangePicker: (size?: (typeof CONTROL_SIZE_NAMES)[number]) => (
    <DateRangePickerTrigger size={size} selected={null}>
      <div />
    </DateRangePickerTrigger>
  ),
};

describe("control sizes", () => {
  it("has three sizes on the 40 / 32 / 24 scale, medium by default", () => {
    expect(CONTROL_SIZE_NAMES).toEqual(["medium", "small", "smaller"]);
    expect(CONTROL_SIZE_NAMES.map((name) => CONTROL_SIZES.sizes[name].px)).toEqual([40, 32, 24]);
    expect(CONTROL_SIZES.default).toBe("medium");
  });

  it("is declared by every component in the Inputs category", () => {
    const undeclared = Object.values(registry.components)
      .filter((c) => c.category === "Inputs" && !("deprecated" in c) && !("sizing" in c))
      .map((c) => c.name);
    expect(undeclared).toEqual([]);
  });

  for (const [name, renderAt] of Object.entries(SIZED)) {
    it(`${name} renders medium by default and each size when asked`, () => {
      const { container, rerender } = render(renderAt());
      expect(container.querySelector("[data-size]")?.getAttribute("data-size")).toBe("medium");
      for (const size of CONTROL_SIZE_NAMES) {
        rerender(renderAt(size));
        expect(container.querySelector("[data-size]")?.getAttribute("data-size")).toBe(size);
      }
    });
  }
});
