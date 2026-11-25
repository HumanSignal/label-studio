import { render, screen } from "@testing-library/react";
import * as Sentry from "../config/Sentry";
import ErrorBoundary from "./ErrorBoundary";

const Broken = () => {
  throw new Error("Something exploded");
};

describe("ErrorBoundary", () => {
  let captureException;
  let consoleError;

  beforeEach(() => {
    captureException = spyOn(Sentry, "captureException").mockImplementation(() => {});
    consoleError = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    captureException.mockRestore();
    consoleError.mockRestore();
  });

  it("renders its children while nothing fails", () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("All good")).toBeInTheDocument();
    expect(screen.queryByTestId("runtime-error-dialog")).toBeNull();
  });

  it("shows the runtime error in a dialog and reports it", () => {
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );

    const dialog = screen.getByTestId("runtime-error-dialog");
    expect(dialog).toHaveTextContent("Runtime error");
    expect(dialog).toHaveTextContent("Something exploded");
    expect(screen.getByTestId("modal-window-close-button")).toBeInTheDocument();
    expect(captureException).toHaveBeenCalled();
  });
});
