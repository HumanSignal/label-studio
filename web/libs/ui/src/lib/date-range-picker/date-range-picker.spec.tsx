import * as transitionUtils from "@humansignal/core/lib/utils/transition";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DateRangePicker } from "./date-range-picker";
import { DateRangePickerTrigger } from "./date-range-picker-trigger";
import type { DateOrDateTimeRange } from "./date-utils";

type TransitionCallbacks = {
  beforeTransition?: () => void;
  transition?: () => void;
  afterTransition?: () => void;
};

const initialDates: DateOrDateTimeRange = {
  start: { day: 10, month: 8, year: 2026 },
  end: { day: 12, month: 8, year: 2026 },
};

const neverMode = (overrides: { selected?: boolean; onChange?: () => void } = {}) => ({
  label: "Never",
  summary: "Never active",
  selected: overrides.selected,
  onChange: overrides.onChange ?? mock(),
});

const nullButton = () => screen.getByTestId("datetime-sidebar-button-null");

beforeEach(() => {
  const runTransitionSync = (_element: unknown, callbacks: TransitionCallbacks) => {
    callbacks.beforeTransition?.();
    callbacks.transition?.();
    callbacks.afterTransition?.();
  };
  spyOn(transitionUtils, "aroundTransition").mockImplementation(
    runTransitionSync as typeof transitionUtils.aroundTransition,
  );
});

describe("DateRangePicker nullMode", () => {
  it("keeps the sidebar presets-only when no nullMode is given", () => {
    render(<DateRangePicker initialDates={initialDates} setAppliedDates={mock()} />);

    expect(screen.queryByTestId("datetime-sidebar-button-null")).toBeNull();
    expect(screen.getByTestId("datetime-sidebar-button-today")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply date" })).toHaveTextContent("Apply Range");
  });

  it("stays unselected while the range is the answer", () => {
    render(<DateRangePicker initialDates={initialDates} setAppliedDates={mock()} nullMode={neverMode()} />);

    expect(nullButton()).toHaveTextContent("Never");
    expect(nullButton()).toHaveClass("look-string");
    expect(screen.getByTestId("days-selected")).toHaveTextContent("3 days");
    expect(screen.getByRole("button", { name: "Apply date" })).toBeDisabled();
  });

  it("takes the calendar out of reach while it is the applied answer", () => {
    render(
      <DateRangePicker initialDates={initialDates} setAppliedDates={mock()} nullMode={neverMode({ selected: true })} />,
    );

    expect(nullButton()).toHaveClass("look-filled");
    expect(screen.getByTestId("days-selected")).toHaveTextContent("Never active");
    expect(screen.getByTestId("time-toggle")).toBeDisabled();
  });

  it("commits on Apply, not on selection", async () => {
    const onChange = mock();
    const setAppliedDates = mock();

    render(
      <DateRangePickerTrigger selected={null} inline dataTestId="date-range-trigger">
        <DateRangePicker
          initialDates={initialDates}
          setAppliedDates={setAppliedDates}
          nullMode={neverMode({ onChange })}
        />
      </DateRangePickerTrigger>,
    );

    fireEvent.click(screen.getByTestId("date-range-trigger"));
    fireEvent.click(await screen.findByTestId("datetime-sidebar-button-null"));

    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Apply date" }));

    expect(onChange).toHaveBeenCalledWith(true);
    // "Never" carries no range, so the picker must not also push dates the filter would ignore.
    expect(setAppliedDates).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByTestId("date-range-trigger")).toHaveAttribute("aria-expanded", "false");
    });
  });

  it("hands the answer back to the range when it is re-picked", () => {
    const onChange = mock();

    render(
      <DateRangePicker
        initialDates={initialDates}
        setAppliedDates={mock()}
        nullMode={neverMode({ selected: true, onChange })}
      />,
    );

    fireEvent.click(nullButton());

    expect(nullButton()).toHaveClass("look-string");
    expect(screen.getByTestId("days-selected")).toHaveTextContent("3 days");

    fireEvent.click(screen.getByRole("button", { name: "Apply date" }));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("discards a pending selection when the picker is cancelled", async () => {
    const onChange = mock();

    render(
      <DateRangePickerTrigger selected={null} inline dataTestId="date-range-trigger">
        <DateRangePicker initialDates={initialDates} setAppliedDates={mock()} nullMode={neverMode({ onChange })} />
      </DateRangePickerTrigger>,
    );

    fireEvent.click(screen.getByTestId("date-range-trigger"));
    fireEvent.click(await screen.findByTestId("datetime-sidebar-button-null"));
    fireEvent.click(screen.getByRole("button", { name: "Close date picker" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(nullButton()).toHaveClass("look-string");
  });

  it("drops the selection when a range preset is picked", () => {
    const onChange = mock();
    const setAppliedDates = mock();

    render(
      <DateRangePicker
        initialDates={initialDates}
        setAppliedDates={setAppliedDates}
        nullMode={neverMode({ selected: true, onChange })}
      />,
    );

    fireEvent.click(screen.getByTestId("datetime-sidebar-button-today"));

    expect(nullButton()).toHaveClass("look-string");

    fireEvent.click(screen.getByRole("button", { name: "Apply date" }));

    expect(onChange).toHaveBeenCalledWith(false);
    expect(setAppliedDates).toHaveBeenCalledTimes(1);
  });

  it("restores the applied answer on Reset", () => {
    render(<DateRangePicker initialDates={initialDates} setAppliedDates={mock()} nullMode={neverMode()} />);

    fireEvent.click(nullButton());
    fireEvent.click(screen.getByRole("button", { name: "Reset date" }));

    expect(nullButton()).toHaveClass("look-string");
    expect(screen.getByRole("button", { name: "Apply date" })).toBeDisabled();
  });
});
