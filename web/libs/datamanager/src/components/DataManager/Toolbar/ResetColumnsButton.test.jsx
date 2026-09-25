import { describe, expect, it, mock, spyOn, afterEach, beforeEach } from "bun:test";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "mobx-react";
import * as coreFf from "@humansignal/core/lib/utils/feature-flags";
import * as ModalModule from "../../Common/Modal/Modal";
import * as SDKProvider from "../../../providers/SDKProvider";
import { ResetColumnsButton, SAVE_AS_DEFAULT_EVENT } from "./ResetColumnsButton";

/**
 * Prefer Provider + spyOn over mock.module.
 * Process-wide mock.module("mobx-react" / Modal) leaks across Bun's shared worker and
 * breaks later suites (GridSelectAll Provider, Hotkey Help Modal).
 */
describe("ResetColumnsButton (FIT-2846 / FIT-2847)", () => {
  let isActiveSpy;
  let confirmSpy;
  let useSDKSpy;
  const invoke = mock();
  const hasHandler = mock((event) => event === "dataManagerSettingsClicked" || event === SAVE_AS_DEFAULT_EVENT);

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
    hasHandler.mockImplementation((event) => event === "dataManagerSettingsClicked" || event === SAVE_AS_DEFAULT_EVENT);
  });

  const renderButton = (viewOverrides = {}, props = {}) => {
    const view = {
      isLockedByManager: false,
      resetColumnsToProjectDefaults: mock(),
      columns: [
        { id: "tasks:id", is_hidden: false },
        { id: "tasks:agreement", is_hidden: true },
      ],
      columnOrderSnapshot: { "tasks:id": 1, "tasks:agreement": 2 },
      ...viewOverrides,
    };
    render(
      <Provider store={{ currentView: view }}>
        <ResetColumnsButton enableSaveAsDefault {...props} />
      </Provider>,
    );
    return view;
  };

  it("renders nothing when the feature flag is off", () => {
    isActiveSpy = spyOn(coreFf, "isActive").mockReturnValue(false);
    const { container } = render(
      <Provider store={{ currentView: {} }}>
        <ResetColumnsButton enableSaveAsDefault />
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

  it("labels the controls Manage Defaults, Reset, and Save as Default", () => {
    isActiveSpy = spyOn(coreFf, "isActive").mockReturnValue(true);
    renderButton();

    expect(screen.getByRole("button", { name: "Manage Defaults" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save as Default" })).toBeInTheDocument();
  });

  it("places Reset leftmost, then Manage Defaults, then Save as Default", () => {
    isActiveSpy = spyOn(coreFf, "isActive").mockReturnValue(true);
    renderButton();

    const buttons = screen.getAllByRole("button").map((el) => el.getAttribute("aria-label"));
    expect(buttons).toEqual(["Reset", "Manage Defaults", "Save as Default"]);
  });

  it("navigates to Data Manager settings from Manage Defaults", () => {
    isActiveSpy = spyOn(coreFf, "isActive").mockReturnValue(true);
    renderButton();

    fireEvent.click(screen.getByTestId("dm-manage-defaults"));
    expect(invoke).toHaveBeenCalledWith("dataManagerSettingsClicked");
  });

  it("hides Manage Defaults when the host has no settings handler", () => {
    isActiveSpy = spyOn(coreFf, "isActive").mockReturnValue(true);
    hasHandler.mockImplementation((event) => event === SAVE_AS_DEFAULT_EVENT);
    renderButton();

    expect(screen.queryByTestId("dm-manage-defaults")).not.toBeInTheDocument();
    expect(screen.getByTestId("dm-reset-columns")).toBeInTheDocument();
    expect(screen.getByTestId("dm-save-as-default")).toBeInTheDocument();
  });

  it("hides Save as Default when enableSaveAsDefault is false", () => {
    isActiveSpy = spyOn(coreFf, "isActive").mockReturnValue(true);
    render(
      <Provider store={{ currentView: { isLockedByManager: false, columns: [], columnOrderSnapshot: {} } }}>
        <ResetColumnsButton enableSaveAsDefault={false} />
      </Provider>,
    );

    expect(screen.getByTestId("dm-reset-columns")).toBeInTheDocument();
    expect(screen.queryByTestId("dm-save-as-default")).not.toBeInTheDocument();
  });

  it("hides Save as Default when the host has no save handler", () => {
    isActiveSpy = spyOn(coreFf, "isActive").mockReturnValue(true);
    hasHandler.mockImplementation((event) => event === "dataManagerSettingsClicked");
    renderButton();

    expect(screen.queryByTestId("dm-save-as-default")).not.toBeInTheDocument();
  });

  it("confirms before saving the tab layout as the project default", () => {
    isActiveSpy = spyOn(coreFf, "isActive").mockReturnValue(true);
    renderButton();

    fireEvent.click(screen.getByTestId("dm-save-as-default"));
    expect(confirmSpy).toHaveBeenCalled();
    const confirmArgs = confirmSpy.mock.calls[0][0];
    expect(confirmArgs.title).toMatch(/Save as Default/i);
    expect(confirmArgs.okText).toBe("Save as Default");
    expect(confirmArgs.body).toMatch(/current tab/i);
    expect(confirmArgs.body).toMatch(/column order and visibility/i);
    expect(confirmArgs.body).toMatch(/default for this project/i);
    expect(invoke).toHaveBeenCalledWith(SAVE_AS_DEFAULT_EVENT, {
      order: ["id", "agreement"],
      visibleIds: ["id"],
    });
  });

  it("does not save when the confirmation is cancelled", () => {
    isActiveSpy = spyOn(coreFf, "isActive").mockReturnValue(true);
    confirmSpy.mockImplementation(() => ({ close: mock() }));
    renderButton();

    fireEvent.click(screen.getByTestId("dm-save-as-default"));
    expect(confirmSpy).toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("is disabled when the tab is locked", () => {
    isActiveSpy = spyOn(coreFf, "isActive").mockReturnValue(true);
    const reset = mock(() => true);
    renderButton({ isLockedByManager: true, resetColumnsToProjectDefaults: reset });

    expect(screen.getByTestId("dm-reset-columns")).toBeDisabled();
    expect(screen.getByTestId("dm-save-as-default")).toBeDisabled();
    fireEvent.click(screen.getByTestId("dm-reset-columns"));
    fireEvent.click(screen.getByTestId("dm-save-as-default"));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });
});
