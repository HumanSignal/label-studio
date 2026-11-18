import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as sameOriginFetchModule from "@humansignal/core/lib/api-proxy/same-origin-fetch";
import { useStepUp } from "@humansignal/app-common/components/step-up/step-up-provider";
import * as uiModule from "@humansignal/ui";
import type { ApiContextType } from "@humansignal/core";
import * as ModalModule from "../components/Modal/Modal";
import { ApiProvider, useAPI } from "./ApiProvider";

const serverError = (detail: string, status = 500, response: Record<string, unknown> = {}) => {
  const result: Record<string, unknown> = { error: "Internal Server Error", response: { detail, ...response } };
  Object.defineProperty(result, "$meta", { value: { status, ok: false }, enumerable: false });
  return result;
};

describe("ApiProvider", () => {
  let api: ApiContextType;
  let withStepUp: ReturnType<typeof useStepUp>;
  let showToast: ReturnType<typeof mock>;
  let imperativeModal: ReturnType<typeof spyOn>;

  const Probe = () => {
    api = useAPI();
    withStepUp = useStepUp();
    return <span data-testid="app">app</span>;
  };
  const renderProvider = () =>
    render(
      <ApiProvider>
        <Probe />
      </ApiProvider>,
    );
  const fail = (result: unknown) =>
    act(async () => {
      await api.handleError(result as never, { showGlobalError: true });
    });

  beforeEach(() => {
    showToast = mock();
    spyOn(uiModule, "useToast").mockReturnValue({ show: showToast } as never);
    imperativeModal = spyOn(ModalModule, "modal");
  });

  afterEach(() => {
    // The error dialog is rendered by the provider: nothing may open one in a React root of its own.
    const calls = imperativeModal.mock.calls.length;
    imperativeModal.mockRestore();
    expect(calls).toBe(0);
  });

  it("shows no dialog while nothing has failed", () => {
    renderProvider();

    expect(screen.getByTestId("app")).toBeInTheDocument();
    expect(screen.queryByTestId("api-error-dialog")).toBeNull();
  });

  it("shows a server error in a dialog inside the provider, with no toast", async () => {
    renderProvider();

    await fail(serverError("The database is on fire"));

    const dialog = await screen.findByTestId("api-error-dialog");
    expect(dialog).toHaveTextContent("Runtime error");
    expect(dialog).toHaveTextContent("The database is on fire");
    expect(showToast).not.toHaveBeenCalled();
  });

  it("does not show the server's stack trace", async () => {
    renderProvider();

    await fail(serverError("The database is on fire", 500, { exc_info: "Traceback: secret_function()" }));

    expect(await screen.findByTestId("api-error-dialog")).not.toHaveTextContent("secret_function");
  });

  it("lets the user close the dialog", async () => {
    renderProvider();
    await fail(serverError("The database is on fire"));
    await screen.findByTestId("api-error-dialog");

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });

    await waitFor(() => expect(screen.queryByTestId("api-error-dialog")).toBeNull());
  });

  it("keeps the first error while its dialog is open, and shows a later one after it is closed", async () => {
    renderProvider();

    await fail(serverError("First failure"));
    await fail(serverError("Second failure"));

    const dialog = await screen.findByTestId("api-error-dialog");
    expect(dialog).toHaveTextContent("First failure");
    expect(screen.getAllByTestId("api-error-dialog")).toHaveLength(1);

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await waitFor(() => expect(screen.queryByTestId("api-error-dialog")).toBeNull());

    await fail(serverError("Third failure"));
    expect(await screen.findByTestId("api-error-dialog")).toHaveTextContent("Third failure");
  });

  it("shows a 4xx with field errors in the dialog", async () => {
    renderProvider();

    await fail(serverError("Invalid input", 400, { validation_errors: { title: ["This field is required."] } }));

    const dialog = await screen.findByTestId("api-error-dialog");
    expect(dialog).toHaveTextContent("This field is required.");
    expect(showToast).not.toHaveBeenCalled();
  });

  it("shows a plain 4xx as a toast, not a dialog", async () => {
    renderProvider();

    await fail(serverError("You do not have permission", 403));

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast.mock.calls[0][0].message).toContain("You do not have permission");
    expect(screen.queryByTestId("api-error-dialog")).toBeNull();
  });

  it("gives everything below it the step-up dialog", async () => {
    const verify = spyOn(sameOriginFetchModule, "sameOriginFetch").mockImplementation((async () => {
      return new Response("{}", { status: 200 });
    }) as never);
    try {
      renderProvider();
      const challenged = serverError("Confirm your identity to continue.", 403, {
        display_context: { step_up: { method: "password", reauthenticate_url: "/user/reauthenticate/" } },
      });
      const request = mock(async () => (request.mock.calls.length === 1 ? challenged : { ok: true }));
      let result: unknown;

      await act(async () => {
        void withStepUp("Create an access token", request).then((value) => {
          result = value;
        });
      });

      expect(await screen.findByText("Confirm it's you")).toBeInTheDocument();
      fireEvent.change(screen.getByTestId("step-up-password"), { target: { value: "hunter2" } });
      fireEvent.click(screen.getByTestId("step-up-confirm"));

      await waitFor(() => expect(result).toEqual({ ok: true }));
      expect(request).toHaveBeenCalledTimes(2);
      expect(screen.queryByTestId("api-error-dialog")).toBeNull();
    } finally {
      verify.mockRestore();
    }
  });
});
