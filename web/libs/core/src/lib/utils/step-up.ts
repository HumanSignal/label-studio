/**
 * Step-up authentication challenge (backend: services/lso/label_studio/users/step_up.py).
 *
 * Actions that hand out an API credential or a managing role answer a stale browser session with
 * 403 `step_up_required` and `display_context.step_up`. The UI answers it with `withStepUp` from
 * `@humansignal/app-common`, which asks the user to confirm their identity and retries the request.
 */
export type StepUpChallenge = {
  /** `password`: confirm the password in place. `reauthenticate`: sign in again (SSO users). */
  method: "password" | "reauthenticate";
  reauthenticate_url: string;
};

const challengeFromBody = (body: unknown): StepUpChallenge | null => {
  const stepUp = (body as { display_context?: { step_up?: StepUpChallenge } } | null)?.display_context?.step_up;
  return stepUp?.method ? stepUp : null;
};

/** The challenge carried by an `APIProxy` result, if the server asked for a step-up. */
export function stepUpChallengeOf(result: unknown): StepUpChallenge | null {
  const apiResult = result as { $meta?: { status?: number }; response?: unknown } | null;
  if (apiResult?.$meta?.status !== 403) return null;
  return challengeFromBody(apiResult.response);
}

/** The challenge carried by a `fetch` response, if the server asked for a step-up. */
export async function stepUpChallengeOfResponse(response: Response): Promise<StepUpChallenge | null> {
  if (response.status !== 403) return null;
  try {
    return challengeFromBody(await response.clone().json());
  } catch {
    return null;
  }
}
