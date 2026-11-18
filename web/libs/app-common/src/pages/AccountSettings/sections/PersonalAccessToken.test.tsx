import * as sameOriginFetchModule from "@humansignal/core/lib/api-proxy/same-origin-fetch";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { StepUpProvider } from "../../../components/step-up/step-up-provider";
import { PersonalAccessToken } from "./PersonalAccessToken";

const challenge = () =>
  new Response(
    JSON.stringify({
      display_context: { step_up: { method: "password", reauthenticate_url: "/user/reauthenticate/" } },
    }),
    { status: 403 },
  );
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

// The example curl request reads the bare `location`, which this app's test setup does not define.
(globalThis as { location?: Location }).location ??= window.location;

describe("PersonalAccessToken step-up", () => {
  let fetchSpy: ReturnType<typeof spyOn>;
  let responses: Record<string, Response[]>;

  const renderSection = () =>
    render(
      <Provider store={createStore()}>
        <StepUpProvider>
          <PersonalAccessToken />
        </StepUpProvider>
      </Provider>,
    );
  const calls = (url: string) => fetchSpy.mock.calls.filter(([called]: [string]) => called === url);

  beforeEach(() => {
    responses = {};
    fetchSpy = spyOn(sameOriginFetchModule, "sameOriginFetch").mockImplementation((async (url: string) => {
      return responses[url]?.shift() ?? json({});
    }) as never);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("asks the user to confirm before showing the token, then shows it", async () => {
    responses["/api/current-user/token"] = [challenge(), json({ token: "secret-token" })];
    renderSection();

    fireEvent.click(screen.getByTestId("access-token-show"));

    expect(await screen.findByText("Confirm it's you")).toBeInTheDocument();
    expect(screen.getByText("Show your access token")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("secret-token")).toBeNull();

    fireEvent.change(screen.getByTestId("step-up-password"), { target: { value: "hunter2" } });
    fireEvent.click(screen.getByTestId("step-up-confirm"));

    expect(await screen.findByDisplayValue("secret-token")).toBeInTheDocument();
    expect(calls("/api/current-user/token")).toHaveLength(2);
    expect(calls("/api/current-user/step-up")).toHaveLength(1);
    expect(screen.queryByText("Confirm it's you")).toBeNull();
  });

  it("keeps the token hidden when the user cancels", async () => {
    responses["/api/current-user/token"] = [challenge(), json({ token: "secret-token" })];
    renderSection();
    fireEvent.click(screen.getByTestId("access-token-show"));
    await screen.findByText("Confirm it's you");

    fireEvent.click(screen.getByTestId("step-up-cancel"));

    await waitFor(() => expect(screen.queryByText("Confirm it's you")).toBeNull());
    expect(screen.queryByDisplayValue("secret-token")).toBeNull();
    expect(calls("/api/current-user/token")).toHaveLength(1);
    expect(screen.getByTestId("access-token-show")).toBeInTheDocument();
  });

  it("asks the user to confirm before resetting the token", async () => {
    responses["/api/current-user/reset-token/"] = [challenge(), json({ token: "new-token" })];
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(await screen.findByText("Reset your access token")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("step-up-password"), { target: { value: "hunter2" } });
    fireEvent.click(screen.getByTestId("step-up-confirm"));

    expect(await screen.findByDisplayValue("new-token")).toBeInTheDocument();
    expect(calls("/api/current-user/reset-token/")).toHaveLength(2);
  });

  it("shows the token with no dialog when the server does not ask", async () => {
    responses["/api/current-user/token"] = [json({ token: "secret-token" })];
    renderSection();

    fireEvent.click(screen.getByTestId("access-token-show"));

    expect(await screen.findByDisplayValue("secret-token")).toBeInTheDocument();
    expect(screen.queryByText("Confirm it's you")).toBeNull();
  });
});
