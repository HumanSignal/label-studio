import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SegmentedControl, type SegmentedControlOption } from "./segmented-control";
import { Tabs, TabsList, TabsTrigger } from "../../shad/components/ui/tabs";

const Controlled = ({ options }: { options: SegmentedControlOption[] }) => {
  const [value, setValue] = useState(options[0].value);
  return <SegmentedControl aria-label="View" selectedOption={value} onChange={setValue} options={options} />;
};

const plain: SegmentedControlOption[] = ["a", "b", "c"].map((value) => ({ value, label: value.toUpperCase() }));
// Icon-only options named through `tooltip`, as in CoursesList / InterfacesList.
const withTooltips: SegmentedControlOption[] = ["a", "b", "c"].map((value) => ({
  value,
  label: value.toUpperCase(),
  tooltip: `Switch to ${value}`,
}));

describe("SegmentedControl keyboard navigation", () => {
  it("is a single tab stop on the selected option", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Controlled options={plain} />
        <button type="button">after</button>
      </>,
    );
    await user.tab();
    expect(screen.getByRole("radio", { name: "A" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
  });

  for (const [name, options] of [
    ["plain options", plain],
    ["options with a tooltip", withTooltips],
  ] as const) {
    describe(name, () => {
      it("arrows move focus and selection together and wrap around", async () => {
        const user = userEvent.setup();
        render(<Controlled options={options} />);
        const radios = screen.getAllByRole("radio");
        await user.tab();

        await user.keyboard("{ArrowRight}");
        expect(radios[1]).toHaveFocus();
        expect(radios[1]).toHaveAttribute("aria-checked", "true");

        await user.keyboard("{ArrowRight}");
        expect(radios[2]).toHaveFocus();

        await user.keyboard("{ArrowRight}");
        expect(radios[0]).toHaveFocus();
        expect(radios[0]).toHaveAttribute("aria-checked", "true");

        await user.keyboard("{ArrowLeft}");
        expect(radios[2]).toHaveFocus();
      });
    });
  }

  it("does not move or select anything while disabled", async () => {
    const user = userEvent.setup();
    const onChange = mock();
    render(<SegmentedControl aria-label="View" selectedOption="a" options={plain} disabled onChange={onChange} />);
    await user.keyboard("{ArrowRight}");
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("Tabs keyboard navigation", () => {
  it("arrows move focus and activate the next tab, wrapping around", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="a">
        <TabsList aria-label="Sections">
          {["a", "b", "c"].map((value) => (
            <TabsTrigger key={value} value={value}>
              {value.toUpperCase()}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>,
    );
    const tabs = screen.getAllByRole("tab");
    await user.tab();
    expect(tabs[0]).toHaveFocus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(tabs[2]).toHaveFocus();
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowRight}");
    expect(tabs[0]).toHaveFocus();
    await user.keyboard("{End}");
    expect(tabs[2]).toHaveFocus();
  });
});
