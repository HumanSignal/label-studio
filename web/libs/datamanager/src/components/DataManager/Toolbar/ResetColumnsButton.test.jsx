import { describe, expect, it, mock, spyOn, afterEach, beforeEach } from "bun:test";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "mobx-react";
import * as coreFf from "@humansignal/core/lib/utils/feature-flags";
import * as ModalModule from "../../Common/Modal/Modal";
import * as SDKProvider from "../../../providers/SDKProvider";
import { ResetColumnsButton } from "./ResetColumnsButton";

/**
 * Prefer Provider + spyOn over mock.module.
 * Process-wide mock.module("mobx-react" / Modal) leaks across Bun's shared worker and
 * breaks later suites (GridSelectAll Provider, Hotkey Help Modal).
 */
describe("ResetColumnsButton (FIT-2846)", () => {
  let isActiveSpy;
  let confirmSpy;
  let useSDKSpy;
  const invoke = mock();
  const hasHandler = mock(() => true);

  beforeEach(() => {
    confirmSpy = spyOn(ModalModule.Modal, "confirm").mockImplementation((props) => {
      props?.onOk?.();
      return { close: mock() };
    });
    useSDKSpy = spyOn(SDKProvider, "useSDK").mockReturnValue({ hasHandler, invoke });
  });

  afterEach(() => {
    isActiveSpy?.mockRestore();
    confirmSpy?.mockRestore();
    useSDKSpy?.mockRestore();
    invoke.mockClear();
    hasHandler.mockClear();
    hasHandler.mockReturnValue(true);
  });

  const renderButton = (viewOverrides = {}) => {
    const view = {
      isLockedByManager: false,
      resetColumnsToProjectDefaults: mock(),
      ...viewOverrides,
    };
    render(
      <Provider store={{ currentView: view }}>
        <ResetColumnsButton />
      </Provider>,
    );
    return view;
  };

  it("renders nothing when the feature flag is off", () => {
    isActiveSpy = spyOn(coreFf, "isActive").mockReturnValue(false);
    const { container } = render(
      <Provider store={{ currentView: {} }}>
        <ResetColumnsButton />
      </Provider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("opens a confirmation dialog before resetting the tab", () => {
    isActiveSpy = spyOn(coreFf, "isActive").mockReturnValue(true);
    const reset = mock(() => true);
    renderButton({ resetColumnsToProjectDefaults: reset });

    fireEvent.click(screen.getByTestId("dm-reset-columns"));
    expect(confirmSpy).toHaveBeenCalled();
    expect(confirmSpy.mock.calls[0][0].okText).toBe("Reset");
    expect(confirmSpy.mock.calls[0][0].buttonLook).toBe("negative");
    expect(confirmSpy.mock.calls[0][0].body).toMatch(/order and visibility/i);
    expect(reset).toHaveBeenCalled();
  });

  it("labels the controls Manage Defaults and Reset", () => {
    isActiveSpy = spyOn(coreFf, "isActive").mockReturnValue(true);
    renderButton();

    expect(screen.getByRole("button", { name: "Manage Defaults" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  });

  it("navigates to Data Manager settings from Manage Defaults", () => {
    isActiveSpy = spyOn(coreFf, "isActive").mockReturnValue(true);
    renderButton();

    fireEvent.click(screen.getByTestId("dm-manage-defaults"));
    expect(invoke).toHaveBeenCalledWith("dataManagerSettingsClicked");
  });

  it("hides Manage Defaults when the host has no settings handler", () => {
    isActiveSpy = spyOn(coreFf, "isActive").mockReturnValue(true);
    hasHandler.mockReturnValue(false);
    renderButton();

    expect(screen.queryByTestId("dm-manage-defaults")).not.toBeInTheDocument();
    expect(screen.getByTestId("dm-reset-columns")).toBeInTheDocument();
  });

  it("is disabled when the tab is locked", () => {
    isActiveSpy = spyOn(coreFf, "isActive").mockReturnValue(true);
    const reset = mock(() => true);
    renderButton({ isLockedByManager: true, resetColumnsToProjectDefaults: reset });

    expect(screen.getByTestId("dm-reset-columns")).toBeDisabled();
    fireEvent.click(screen.getByTestId("dm-reset-columns"));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
  });
});
