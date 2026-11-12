import type { StepUpChallenge } from "@humansignal/core";
import { reauthenticateHref, withStepUp } from "./with-step-up";

const CHALLENGE: StepUpChallenge = { method: "password", reauthenticate_url: "/user/reauthenticate/" };

/** An APIProxy result (`callApi` / `api.invoke`) carrying `status` and `response`. */
const apiResult = (status: number, response: unknown = {}) => {
  const result: Record<string, unknown> =
    status >= 400 ? { error: "Forbidden", response } : { ...(response as object) };
  Object.defineProperty(result, "$meta", { value: { status, ok: status < 400 }, enumerable: false });
  return result;
};

const challenged = () =>
  apiResult(403, { detail: "Confirm your identity to continue.", display_context: { step_up: CHALLENGE } });

const sequence = <T>(...results: T[]) => {
  let calls = 0;
  const request = async () => results[Math.min(calls++, results.length - 1)];
  return { request, calls: () => calls };
};

describe("withStepUp", () => {
  it("returns the result as is when the server does not ask for a step-up", async () => {
    const ok = apiResult(200, { token: "t" });
    const { request, calls } = sequence(ok);
    const asked: string[] = [];

    const result = await withStepUp("Create an access token", request, async (action) => {
      asked.push(action);
      return true;
    });

    expect(result).toBe(ok);
    expect(calls()).toBe(1);
    expect(asked).toEqual([]);
  });

  it("does not treat other 403s as a step-up", async () => {
    const denied = apiResult(403, { detail: "You do not have permission" });
    const { request, calls } = sequence(denied);

    expect(await withStepUp("Change a member's role", request, async () => true)).toBe(denied);
    expect(calls()).toBe(1);
  });

  it("asks the user to confirm the named action, then retries once", async () => {
    const ok = apiResult(201, { token: "t" });
    const { request, calls } = sequence(challenged(), ok);
    const asked: Array<[string, StepUpChallenge]> = [];

    const result = await withStepUp("Create an access token", request, async (action, challenge) => {
      asked.push([action, challenge]);
      return true;
    });

    expect(result).toBe(ok);
    expect(calls()).toBe(2);
    expect(asked).toEqual([["Create an access token", CHALLENGE]]);
  });

  it("hands the challenged result back when the user cancels", async () => {
    const first = challenged();
    const { request, calls } = sequence(first, apiResult(201));

    expect(await withStepUp("Create an access token", request, async () => false)).toBe(first);
    expect(calls()).toBe(1);
  });

  it("reads the challenge from a fetch response", async () => {
    const body = JSON.stringify({ display_context: { step_up: CHALLENGE } });
    const ok = new Response(JSON.stringify({ token: "t" }), { status: 200 });
    const { request, calls } = sequence(new Response(body, { status: 403 }), ok);

    expect(await withStepUp("Show your access token", request, async () => true)).toBe(ok);
    expect(calls()).toBe(2);
  });
});

describe("reauthenticateHref", () => {
  it("keeps the sign-in URL's query and returns to the current page", () => {
    const location = new URL("https://ls.example/organization/sso?step=3#scim") as unknown as Location;

    expect(reauthenticateHref("/saml/abc/login?reauthenticate=1", location)).toBe(
      "/saml/abc/login?reauthenticate=1&next=%2Forganization%2Fsso%3Fstep%3D3%23scim",
    );
  });
});
