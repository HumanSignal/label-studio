import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import registry from "../../components.manifest.json";
import { DateRangePickerTrigger } from "../lib/date-range-picker/date-range-picker-trigger";
import { SearchInput } from "../lib/search-input/search-input";
import { SegmentedControl } from "../lib/segmented-control/segmented-control";
import { TextArea } from "../lib/text-area/text-area";
import { CONTROL_SIZE_NAMES, CONTROL_SIZES, controlIconWeight } from "./control-sizes";

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

  describe("icons in controls", () => {
    const read = (path: string) => Bun.file(new URL(path, import.meta.url)).text();
    const SEMANTIC = ["spacing-tightest", "spacing-tighter", "spacing-tight", "spacing-base", "spacing-wide"];

    it("sizes icons 20 / 16 / 12 and spaces them with semantic tokens only", () => {
      expect(CONTROL_SIZE_NAMES.map((size) => CONTROL_SIZES.icons.sizes[size].icon)).toEqual([20, 16, 12]);
      for (const size of CONTROL_SIZE_NAMES) {
        const { edge, gap, text_inset } = CONTROL_SIZES.icons.sizes[size];
        for (const token of [edge, gap, text_inset]) expect(SEMANTIC).toContain(token);
      }
    });

    it.each([
      ["Button", "../lib/button/button.module.css"],
      ["Input", "../lib/input/input.module.css"],
      ["SearchInput", "../lib/search-input/search-input.module.css"],
      ["Select", "../lib/select/select.module.css"],
      ["InputFile", "../lib/InputFile/InputFile.module.css"],
      ["SegmentedControl", "../lib/segmented-control/segmented-control.module.css"],
      ["MultiTreeSelect", "../lib/multi-tree-select/multi-tree-select.prefix.css"],
    ])("%s declares the icon size of every control size", async (_name, path) => {
      const css = await read(path);
      for (const size of CONTROL_SIZE_NAMES) expect(css).toContain(`${CONTROL_SIZES.icons.sizes[size].icon}px`);
    });

    it.each([
      ["Button", "../lib/button/button.module.css"],
      ["Input", "../lib/input/input.module.css"],
      ["SearchInput", "../lib/search-input/search-input.module.css"],
      ["Select", "../lib/select/select.module.css"],
      ["InputFile", "../lib/InputFile/InputFile.module.css"],
      ["MultiTreeSelect", "../lib/multi-tree-select/multi-tree-select.prefix.css"],
    ])("%s pads and gaps with semantic spacing tokens, never primitives", async (_name, path) => {
      const css = await read(path);
      const spacing = [...css.matchAll(/(?:padding|gap|margin)[a-z-]*:[^;]*/g)].map((m) => m[0]);
      for (const declaration of spacing) expect(declaration).not.toMatch(/--spacing-\d/);
    });

    it("draws icons bold at 18px or smaller and regular above", () => {
      expect(CONTROL_SIZE_NAMES.map((size) => controlIconWeight(size))).toEqual(["regular", "bold", "bold"]);
      for (const size of CONTROL_SIZE_NAMES) {
        const { container } = render(<SearchInput size={size} aria-label="Search" value="Car" onChange={() => {}} />);
        const [magnifier, clear] = [...container.querySelectorAll("svg")];
        // Phosphor's bold and regular glyphs differ in stroke; the weight shows in the drawn path.
        const regular = render(<SearchInput size="medium" aria-label="Search" value="Car" onChange={() => {}} />);
        const [regularMagnifier] = [...regular.container.querySelectorAll("svg")];
        const same = magnifier.innerHTML === regularMagnifier.innerHTML;
        expect(same).toBe(controlIconWeight(size) === "regular");
        expect(clear).toBeTruthy();
      }
    });

    it("sizes the date trigger's calendar with the icon size", () => {
      for (const size of CONTROL_SIZE_NAMES) {
        const { container } = render(
          <DateRangePickerTrigger size={size} selected={null}>
            <div />
          </DateRangePickerTrigger>,
        );
        const icon = container.querySelector("svg");
        expect(icon?.getAttribute("width")).toBe(String(CONTROL_SIZES.icons.sizes[size].icon));
      }
    });
  });
});
