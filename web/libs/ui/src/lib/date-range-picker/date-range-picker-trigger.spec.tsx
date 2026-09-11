import * as transitionUtils from "@humansignal/core/lib/utils/transition";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DateRangePickerTrigger } from "./date-range-picker-trigger";

type TransitionCallbacks = {
  beforeTransition?: () => void;
  transition?: () => void;
  afterTransition?: () => void;
};

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

describe("DateRangePickerTrigger", () => {
  it("exposes aria-expanded on the trigger when the dropdown opens", async () => {
    render(
      <DateRangePickerTrigger selected={null} inline dataTestId="date-range-trigger">
        <div>Picker panel</div>
      </DateRangePickerTrigger>,
    );

    const trigger = screen.getByTestId("date-range-trigger");
    expect(trigger).toHaveAttribute("aria-haspopup", "true");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "true");
    });
  });

  it("forwards onToggle when the dropdown opens", async () => {
    const onToggle = mock();

    render(
      <DateRangePickerTrigger selected={null} inline dataTestId="date-range-trigger" onToggle={onToggle}>
        <div>Picker panel</div>
      </DateRangePickerTrigger>,
    );

    fireEvent.click(screen.getByTestId("date-range-trigger"));

    await waitFor(() => {
      expect(onToggle).toHaveBeenCalledWith(true);
    });
  });
});
