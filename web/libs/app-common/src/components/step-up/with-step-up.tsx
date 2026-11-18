import { type FormEvent, useState } from "react";
import { type StepUpChallenge, stepUpChallengeOf, stepUpChallengeOfResponse } from "@humansignal/core";
import { sameOriginFetch } from "@humansignal/core/lib/api-proxy/same-origin-fetch";
import { Button, Label, ModalWindow, Typography } from "@humansignal/ui";

/** Asks the user to confirm their identity. Resolves true once confirmed, false when they cancel. */
export type ConfirmIdentity = (action: string, challenge: StepUpChallenge) => Promise<boolean>;

/**
 * Runs a request that the server may answer with a step-up challenge
 * (services/lso/label_studio/users/step_up.py), for an action the user has just asked for.
 *
 * On a challenge it asks the user to confirm their identity for `action`, then retries the request
 * once. When the user cancels, the challenged result is returned as it is, so the caller handles
 * it like any other failed request.
 *
 * Components do not call this: they take `withStepUp` from `useStepUp()`, which shows the dialog.
 */
export async function runWithStepUp<T>(
  action: string,
  request: () => Promise<T>,
  confirmIdentity: ConfirmIdentity,
): Promise<T> {
  const result = await request();
  const challenge = result instanceof Response ? await stepUpChallengeOfResponse(result) : stepUpChallengeOf(result);
  if (!challenge) return result;
  return (await confirmIdentity(action, challenge)) ? request() : result;
}

/** The sign-in URL for an SSO step-up, returning to the current page afterwards. */
export function reauthenticateHref(reauthenticateUrl: string, location: Location = window.location) {
  const url = new URL(reauthenticateUrl, location.origin);
  url.searchParams.set("next", `${location.pathname}${location.search}${location.hash}`);
  return `${url.pathname}${url.search}`;
}

async function verifyPassword(password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await sameOriginFetch("/api/current-user/step-up", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ current_password: password }),
  });
  if (response.ok) return { ok: true };
  const body = await response.json().catch(() => ({}));
  const error = body?.validation_errors?.current_password?.[0] ?? body?.detail ?? "Could not confirm your password";
  return { ok: false, error };
}

type StepUpDialogProps = {
  action: string;
  challenge: StepUpChallenge;
  onDone: (confirmed: boolean) => void;
};

export const StepUpDialog = ({ action, challenge, onDone }: StepUpDialogProps) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const signInAgain = challenge.method === "reauthenticate";

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (signInAgain) {
      window.location.assign(reauthenticateHref(challenge.reauthenticate_url));
      return;
    }
    setSubmitting(true);
    const verified = await verifyPassword(password);
    setSubmitting(false);
    if (verified.ok) onDone(true);
    else setError(verified.error);
  };

  return (
    <ModalWindow
      open
      placement="center"
      size="small"
      title="Confirm it's you"
      onOpenChange={(open) => !open && onDone(false)}
      footer={
        <>
          <Button look="outlined" onClick={() => onDone(false)} data-testid="step-up-cancel">
            Cancel
          </Button>
          <Button
            onClick={() => submit()}
            waiting={submitting}
            disabled={!signInAgain && password.length === 0}
            data-testid="step-up-confirm"
          >
            {signInAgain ? "Sign in again" : "Confirm"}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-base">
        <Typography variant="body" size="small">
          <strong>{action}</strong>
          <br />
          {signInAgain
            ? "Sign in again to continue. You will come back to this page."
            : "Enter your password to continue."}
        </Typography>
        {!signInAgain && (
          <Label text="Password">
            <input
              type="password"
              name="step-up-password"
              autoComplete="current-password"
              autoFocus
              className="w-full h-9 px-tight bg-neutral-surface border border-neutral-border rounded-md text-body-medium"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              data-testid="step-up-password"
            />
          </Label>
        )}
        {error && (
          <Typography variant="body" size="small" className="text-negative-content" data-testid="step-up-error">
            {error}
          </Typography>
        )}
      </form>
    </ModalWindow>
  );
};
