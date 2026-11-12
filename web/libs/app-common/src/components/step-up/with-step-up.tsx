import { type FormEvent, useState } from "react";
import { createRoot } from "react-dom/client";
import { type StepUpChallenge, stepUpChallengeOf, stepUpChallengeOfResponse } from "@humansignal/core";
import { sameOriginFetch } from "@humansignal/core/lib/api-proxy/same-origin-fetch";
import { Button, Label, ModalWindow, Typography } from "@humansignal/ui";

/**
 * Runs a request that the server may answer with a step-up challenge
 * (services/lso/label_studio/users/step_up.py), for an action the user has just asked for.
 *
 * On a challenge it asks the user to confirm their identity for `action`, then retries the request
 * once. Password users confirm in place. SSO users are sent to sign in again and come back to this
 * page. When the user cancels, the challenged result is returned as it is, so the caller handles
 * it like any other failed request.
 *
 * Only wrap requests the user started on purpose: the dialog names the action they are confirming.
 * `request` may use `callApi`, `api.invoke` or `sameOriginFetch`: all three return the challenge.
 */
export async function withStepUp<T>(
  action: string,
  request: () => Promise<T>,
  confirm: (action: string, challenge: StepUpChallenge) => Promise<boolean> = confirmIdentity,
): Promise<T> {
  const result = await request();
  const challenge = result instanceof Response ? await stepUpChallengeOfResponse(result) : stepUpChallengeOf(result);
  if (!challenge) return result;
  return (await confirm(action, challenge)) ? request() : result;
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

const StepUpDialog = ({ action, challenge, onDone }: StepUpDialogProps) => {
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
      variant="dialog"
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

/** Shows the step-up dialog. Resolves true once identity is confirmed, false when cancelled. */
export function confirmIdentity(action: string, challenge: StepUpChallenge): Promise<boolean> {
  return new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const done = (confirmed: boolean) => {
      root.unmount();
      container.remove();
      resolve(confirmed);
    };
    root.render(<StepUpDialog action={action} challenge={challenge} onDone={done} />);
  });
}
