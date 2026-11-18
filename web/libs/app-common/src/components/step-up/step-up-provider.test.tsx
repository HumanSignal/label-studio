import type { StepUpChallenge } from "@humansignal/core";
import * as sameOriginFetchModule from "@humansignal/core/lib/api-proxy/same-origin-fetch";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import * as ReactDomClient from "react-dom/client";
import { StepUpProvider, useStepUp, type WithStepUp } from "./step-up-provider";

const PASSWORD: StepUpChallenge = { method: "password", reauthenticate_url: "/user/reauthenticate/" };
const SSO: StepUpChallenge = { method: "reauthenticate", reauthenticate_url: "/saml/abc/login?reauthenticate=1" };

const apiResult = (status: number, response: unknown = {}) => {
  const result: Record<string, unknown> =
    status >= 400 ? { error: "Forbidden", response } : { ...(response as object) };
  Object.defineProperty(result, "$meta", { value: { status, ok: status < 400 }, enumerable: false });
  return result;
};
const challenged = (challenge: StepUpChallenge = PASSWORD) =>
  apiResult(403, { detail: "Confirm your identity to continue.", display_context: { step_up: challenge } });

/** A request that answers with `results` in order, repeating the last one. */
const sequence = (...results: unknown[]) => {
  const request = mock(async () => results[Math.min(request.mock.calls.length - 1, results.length - 1)]);
  return request;
};

/** A screen that runs one step-up protected request and shows what came back. */
const Screen = ({
  action,
  request,
  name = "run",
}: {
  action: string;
  request: () => Promise<unknown>;
  name?: string;
}) => {
  const withStepUp = useStepUp();
  const [outcome, setOutcome] = useState("idle");
  return (
    <div>
      <button
        type="button"
        data-testid={name}
        onClick={async () => {
          setOutcome("waiting");
          const result = (await withStepUp(action, request)) as { error?: string };
          setOutcome(result.error ? "challenged" : "ok");
        }}
      >
        {name}
      </button>
      <span data-testid={`${name}-outcome`}>{outcome}</span>
    </div>
  );
};

describe("StepUpProvider", () => {
  let verify: ReturnType<typeof spyOn>;
  let verifyResponses: Response[];

  beforeEach(() => {
    verifyResponses = [];
    verify = spyOn(sameOriginFetchModule, "sameOriginFetch").mockImplementation((async () => {
      return verifyResponses.shift() ?? new Response("{}", { status: 200 });
    }) as never);
  });

  afterEach(() => {
    verify.mockRestore();
  });

  const typePassword = (value: string) =>
    fireEvent.change(screen.getByTestId("step-up-password"), { target: { value } });

  it("shows no dialog when the server does not ask for a step-up", async () => {
    const request = sequence(apiResult(200));
    render(
      <StepUpProvider>
        <Screen action="Create an access token" request={request} />
      </StepUpProvider>,
    );

    fireEvent.click(screen.getByTestId("run"));

    await waitFor(() => expect(screen.getByTestId("run-outcome")).toHaveTextContent("ok"));
    expect(request).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Confirm it's you")).toBeNull();
  });

  it("asks for the password, names the action, and retries the request once on confirm", async () => {
    const request = sequence(challenged(), apiResult(201));
    render(
      <StepUpProvider>
        <Screen action="Create an access token" request={request} />
      </StepUpProvider>,
    );

    fireEvent.click(screen.getByTestId("run"));

    expect(await screen.findByText("Confirm it's you")).toBeInTheDocument();
    expect(screen.getByText("Create an access token")).toBeInTheDocument();
    expect(screen.getByTestId("step-up-confirm")).toBeDisabled();
    expect(request).toHaveBeenCalledTimes(1);

    typePassword("hunter2");
    fireEvent.click(screen.getByTestId("step-up-confirm"));

    await waitFor(() => expect(screen.getByTestId("run-outcome")).toHaveTextContent("ok"));
    expect(request).toHaveBeenCalledTimes(2);
    expect(verify).toHaveBeenCalledTimes(1);
    const [url, init] = verify.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/current-user/step-up");
    expect(JSON.parse(init.body as string)).toEqual({ current_password: "hunter2" });
    expect(screen.queryByText("Confirm it's you")).toBeNull();
  });

  it("submits the password on Enter", async () => {
    const request = sequence(challenged(), apiResult(201));
    render(
      <StepUpProvider>
        <Screen action="Create an access token" request={request} />
      </StepUpProvider>,
    );
    fireEvent.click(screen.getByTestId("run"));
    await screen.findByText("Confirm it's you");

    typePassword("hunter2");
    fireEvent.submit(screen.getByTestId("step-up-password").closest("form") as HTMLFormElement);

    await waitFor(() => expect(screen.getByTestId("run-outcome")).toHaveTextContent("ok"));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("hands the challenged result back on Cancel, without retrying or verifying", async () => {
    const request = sequence(challenged(), apiResult(201));
    render(
      <StepUpProvider>
        <Screen action="Create an access token" request={request} />
      </StepUpProvider>,
    );
    fireEvent.click(screen.getByTestId("run"));
    await screen.findByText("Confirm it's you");

    fireEvent.click(screen.getByTestId("step-up-cancel"));

    await waitFor(() => expect(screen.getByTestId("run-outcome")).toHaveTextContent("challenged"));
    expect(request).toHaveBeenCalledTimes(1);
    expect(verify).not.toHaveBeenCalled();
    expect(screen.queryByText("Confirm it's you")).toBeNull();
  });

  for (const [name, dismiss] of [
    ["Escape", () => fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" })],
    ["the close button", () => fireEvent.click(screen.getByTestId("modal-window-close-button"))],
  ] as const) {
    it(`treats ${name} as Cancel`, async () => {
      const request = sequence(challenged(), apiResult(201));
      render(
        <StepUpProvider>
          <Screen action="Create an access token" request={request} />
        </StepUpProvider>,
      );
      fireEvent.click(screen.getByTestId("run"));
      await screen.findByText("Confirm it's you");

      dismiss();

      await waitFor(() => expect(screen.getByTestId("run-outcome")).toHaveTextContent("challenged"));
      expect(request).toHaveBeenCalledTimes(1);
      expect(verify).not.toHaveBeenCalled();
      expect(screen.queryByText("Confirm it's you")).toBeNull();
    });
  }

  for (const [name, status, body, message] of [
    ["a list", 400, { validation_errors: { current_password: ["Incorrect password"] } }, "Incorrect password"],
    ["a string", 400, { validation_errors: { current_password: "Incorrect password" } }, "Incorrect password"],
    [
      "a lockout detail",
      429,
      { detail: "Too many wrong passwords. Try again later. Expected available in 900 seconds." },
      "Too many wrong passwords. Try again later. Expected available in 900 seconds.",
    ],
  ] as const) {
    it(`keeps the dialog up with the server's whole reason given as ${name}, then goes on once it is right`, async () => {
      verifyResponses = [new Response(JSON.stringify(body), { status }), new Response("{}", { status: 200 })];
      const request = sequence(challenged(), apiResult(201));
      render(
        <StepUpProvider>
          <Screen action="Create an access token" request={request} />
        </StepUpProvider>,
      );
      fireEvent.click(screen.getByTestId("run"));
      await screen.findByText("Confirm it's you");

      typePassword("nope");
      fireEvent.click(screen.getByTestId("step-up-confirm"));

      expect((await screen.findByTestId("step-up-error")).textContent).toBe(message);
      expect(request).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("run-outcome")).toHaveTextContent("waiting");

      typePassword("hunter2");
      fireEvent.click(screen.getByTestId("step-up-confirm"));

      await waitFor(() => expect(screen.getByTestId("run-outcome")).toHaveTextContent("ok"));
      expect(request).toHaveBeenCalledTimes(2);
    });
  }

  it("does not ask twice when the retried request is challenged again", async () => {
    const request = sequence(challenged(), challenged());
    render(
      <StepUpProvider>
        <Screen action="Create an access token" request={request} />
      </StepUpProvider>,
    );
    fireEvent.click(screen.getByTestId("run"));
    await screen.findByText("Confirm it's you");

    typePassword("hunter2");
    fireEvent.click(screen.getByTestId("step-up-confirm"));

    await waitFor(() => expect(screen.getByTestId("run-outcome")).toHaveTextContent("challenged"));
    expect(request).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Confirm it's you")).toBeNull();
  });

  it("sends an SSO user to sign in again and back to this page, with no password field", async () => {
    const back = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.history.replaceState({}, "", "/organization/sso?step=3");
    const assign = spyOn(window.location, "assign").mockImplementation(() => {});
    try {
      const request = sequence(challenged(SSO));
      render(
        <StepUpProvider>
          <Screen action="Change SSO settings" request={request} />
        </StepUpProvider>,
      );
      fireEvent.click(screen.getByTestId("run"));
      await screen.findByText("Confirm it's you");

      expect(screen.queryByTestId("step-up-password")).toBeNull();
      expect(screen.getByTestId("step-up-confirm")).toHaveTextContent("Sign in again");
      expect(screen.getByTestId("step-up-confirm")).not.toBeDisabled();
      fireEvent.click(screen.getByTestId("step-up-confirm"));

      expect(assign).toHaveBeenCalledWith("/saml/abc/login?reauthenticate=1&next=%2Forganization%2Fsso%3Fstep%3D3");
      expect(verify).not.toHaveBeenCalled();
      expect(request).toHaveBeenCalledTimes(1);
    } finally {
      assign.mockRestore();
      window.history.replaceState({}, "", back);
    }
  });

  it("renders the dialog in the provider's tree, not in a React root of its own", async () => {
    const createRoot = spyOn(ReactDomClient, "createRoot");
    try {
      const request = sequence(challenged(), apiResult(201));
      render(
        <StepUpProvider>
          <Screen action="Create an access token" request={request} />
        </StepUpProvider>,
      );
      const rootsBefore = createRoot.mock.calls.length;
      const bodyChildrenBefore = document.body.children.length;

      fireEvent.click(screen.getByTestId("run"));
      await screen.findByText("Confirm it's you");
      expect(createRoot.mock.calls.length).toBe(rootsBefore);

      fireEvent.click(screen.getByTestId("step-up-cancel"));
      await waitFor(() => expect(screen.queryByText("Confirm it's you")).toBeNull());
      await waitFor(() => expect(document.body.children.length).toBe(bodyChildrenBefore));
    } finally {
      createRoot.mockRestore();
    }
  });

  it("keeps the dialog and finishes the request when the screen that asked unmounts", async () => {
    const request = sequence(challenged(), apiResult(201));
    const Host = () => {
      const [shown, setShown] = useState(true);
      return (
        <StepUpProvider>
          <button type="button" data-testid="close-screen" onClick={() => setShown(false)}>
            close
          </button>
          {shown && <Screen action="Change SSO settings" request={request} />}
        </StepUpProvider>
      );
    };
    render(<Host />);
    fireEvent.click(screen.getByTestId("run"));
    await screen.findByText("Confirm it's you");

    fireEvent.click(screen.getByTestId("close-screen"));
    expect(screen.queryByTestId("run")).toBeNull();
    expect(screen.getByText("Confirm it's you")).toBeInTheDocument();

    typePassword("hunter2");
    fireEvent.click(screen.getByTestId("step-up-confirm"));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText("Confirm it's you")).toBeNull());
  });

  it("shows one dialog for requests challenged at the same time, and answers all of them", async () => {
    for (const [confirm, outcome, calls] of [
      [true, "ok", 2],
      [false, "challenged", 1],
    ] as const) {
      const first = sequence(challenged(), apiResult(201));
      const second = sequence(challenged(), apiResult(201));
      const view = render(
        <StepUpProvider>
          <Screen name="first" action="Change SSO settings" request={first} />
          <Screen name="second" action="Change SCIM settings" request={second} />
        </StepUpProvider>,
      );
      fireEvent.click(screen.getByTestId("first"));
      fireEvent.click(screen.getByTestId("second"));
      await screen.findByText("Confirm it's you");
      await waitFor(() => expect(second).toHaveBeenCalledTimes(1));

      expect(screen.getAllByText("Confirm it's you")).toHaveLength(1);
      expect(screen.getByText("Change SSO settings")).toBeInTheDocument();

      if (confirm) {
        typePassword("hunter2");
        fireEvent.click(screen.getByTestId("step-up-confirm"));
      } else {
        fireEvent.click(screen.getByTestId("step-up-cancel"));
      }

      await waitFor(() => expect(screen.getByTestId("first-outcome")).toHaveTextContent(outcome));
      await waitFor(() => expect(screen.getByTestId("second-outcome")).toHaveTextContent(outcome));
      expect(first).toHaveBeenCalledTimes(calls);
      expect(second).toHaveBeenCalledTimes(calls);
      expect(verify).toHaveBeenCalledTimes(confirm ? 1 : 0);
      expect(screen.queryByText("Confirm it's you")).toBeNull();
      view.unmount();
      verify.mockClear();
    }
  });

  it("asks again, with an empty password, for a later challenge", async () => {
    const request = sequence(challenged(), apiResult(201), challenged(), apiResult(201));
    render(
      <StepUpProvider>
        <Screen action="Create an access token" request={request} />
      </StepUpProvider>,
    );
    fireEvent.click(screen.getByTestId("run"));
    await screen.findByText("Confirm it's you");
    typePassword("hunter2");
    fireEvent.click(screen.getByTestId("step-up-confirm"));
    await waitFor(() => expect(screen.getByTestId("run-outcome")).toHaveTextContent("ok"));

    fireEvent.click(screen.getByTestId("run"));

    expect(await screen.findByText("Confirm it's you")).toBeInTheDocument();
    expect(screen.getByTestId("step-up-password")).toHaveValue("");
    fireEvent.click(screen.getByTestId("step-up-cancel"));
    await waitFor(() => expect(screen.getByTestId("run-outcome")).toHaveTextContent("challenged"));
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("returns the challenged result to requests still waiting when the provider unmounts", async () => {
    const first = challenged();
    const request = sequence(first, apiResult(201));
    let withStepUp: WithStepUp | undefined;
    const Grab = () => {
      withStepUp = useStepUp();
      return null;
    };
    const view = render(
      <StepUpProvider>
        <Grab />
      </StepUpProvider>,
    );
    let result: unknown;
    await act(async () => {
      void withStepUp?.("Create an access token", request).then((value) => {
        result = value;
      });
    });
    await screen.findByText("Confirm it's you");

    view.unmount();

    await waitFor(() => expect(result).toBe(first));
    expect(request).toHaveBeenCalledTimes(1);
  });

  describe("with no provider above the caller", () => {
    let withStepUp: WithStepUp | undefined;
    const Grab = () => {
      withStepUp = useStepUp();
      return null;
    };

    it("still runs requests the server does not challenge", async () => {
      render(<Grab />);
      const ok = apiResult(200);
      const request = sequence(ok);

      expect(await withStepUp?.("Create an access token", request)).toBe(ok);
      expect(request).toHaveBeenCalledTimes(1);
    });

    it("rejects a challenged request with an error naming the action, instead of hanging", async () => {
      render(<Grab />);
      const request = sequence(challenged(), apiResult(201));

      await expect(withStepUp?.("Create an access token", request)).rejects.toThrow(
        /"Create an access token" needs the user to confirm their identity, but no StepUpProvider/,
      );
      expect(request).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("Confirm it's you")).toBeNull();
    });
  });
});
