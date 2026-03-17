import { act, render, screen } from "@testing-library/react";
import { TimeAgo } from "../TimeAgo";

describe("TimeAgo", () => {
  const fixedNow = new Date("2025-02-10T12:00:00.000Z").getTime();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders relative time for a date in the past", () => {
    const twoHoursAgo = new Date(fixedNow - 2 * 60 * 60 * 1000);
    render(<TimeAgo date={twoHoursAgo} />);
    expect(screen.getByText(/2 hours ago/)).toBeInTheDocument();
  });

  it("shows 'seconds ago' when date is less than a minute ago", () => {
    const tenSecondsAgo = new Date(fixedNow - 10 * 1000);
    render(<TimeAgo date={tenSecondsAgo} />);
    expect(screen.getByText("seconds ago")).toBeInTheDocument();
  });

  it("accepts date as number timestamp", () => {
    const twoHoursAgo = fixedNow - 2 * 60 * 60 * 1000;
    render(<TimeAgo date={twoHoursAgo} />);
    expect(screen.getByText(/2 hours ago/)).toBeInTheDocument();
  });

  it("accepts date as ISO string", () => {
    const twoHoursAgo = new Date(fixedNow - 2 * 60 * 60 * 1000).toISOString();
    render(<TimeAgo date={twoHoursAgo} />);
    expect(screen.getByText(/2 hours ago/)).toBeInTheDocument();
  });

  it("renders semantic time element with dateTime and title", () => {
    const past = new Date(fixedNow - 5 * 60 * 1000);
    render(<TimeAgo date={past} />);
    const el = screen.getByRole("time");
    expect(el).toHaveAttribute("dateTime");
    expect(el.getAttribute("dateTime")).toMatch(/2025-02-10/);
    expect(el).toHaveAttribute("title");
  });

  it("passes through rest props to the time element", () => {
    render(<TimeAgo date={fixedNow - 1000} className="custom" data-testid="time-ago" />);
    const el = screen.getByTestId("time-ago");
    expect(el).toHaveClass("custom");
  });

  it("schedules an update and re-renders when timer fires", () => {
    const tenSecondsAgo = new Date(fixedNow - 10 * 1000);
    render(<TimeAgo date={tenSecondsAgo} />);
    expect(screen.getByText("seconds ago")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(55 * 1000);
    });
    expect(screen.getByText(/1 minute ago/)).toBeInTheDocument();
  });

  it("cleans up timeout on unmount", () => {
    const clearTimeoutSpy = jest.spyOn(window, "clearTimeout");
    const past = new Date(fixedNow - 1000);
    const { unmount } = render(<TimeAgo date={past} />);
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it("covers getNextTick for first stage (0–30s)", () => {
    const fiveSecondsAgo = new Date(fixedNow - 5 * 1000);
    render(<TimeAgo date={fiveSecondsAgo} />);
    expect(screen.getByText("seconds ago")).toBeInTheDocument();
  });

  it("covers getNextTick for second stage (30s–44m30s)", () => {
    const fiveMinutesAgo = new Date(fixedNow - 5 * 60 * 1000);
    render(<TimeAgo date={fiveMinutesAgo} />);
    expect(screen.getByText(/5 minutes ago/)).toBeInTheDocument();
  });

  it("covers getNextTick for third stage (44m30s+)", () => {
    const oneHourAgo = new Date(fixedNow - 60 * 60 * 1000);
    render(<TimeAgo date={oneHourAgo} />);
    expect(screen.getByText(/1 hour ago/)).toBeInTheDocument();
  });
});
