import type { StepUpChallenge } from "@humansignal/core";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from "react";
import { type ConfirmIdentity, runWithStepUp, StepUpDialog } from "./with-step-up";

/**
 * Runs a request the server may answer with a step-up challenge. On a challenge the user is asked to confirm
 * their identity for `action`, and the request is retried once. Password users confirm in place. SSO users are
 * sent to sign in again and come back to this page. When the user cancels, the challenged result is returned as
 * it is, so the caller handles it like any other failed request.
 *
 * Only wrap requests the user started on purpose: the dialog names the action they are confirming.
 * `request` may use `callApi`, `api.invoke` or `sameOriginFetch`: all three return the challenge.
 */
export type WithStepUp = <T>(action: string, request: () => Promise<T>) => Promise<T>;

const StepUpContext = createContext<WithStepUp | null>(null);

type Answer = { promise: Promise<boolean>; resolve: (confirmed: boolean) => void };

/**
 * Renders the step-up dialog for everything below it. It sits at the root of the app (the app's ApiProvider
 * renders it), so the dialog outlives the screen or modal whose request was challenged.
 */
export function StepUpProvider({ children }: PropsWithChildren) {
  const [pending, setPending] = useState<{ action: string; challenge: StepUpChallenge } | null>(null);
  const answer = useRef<Answer | null>(null);

  const confirmIdentity = useCallback<ConfirmIdentity>((action, challenge) => {
    // One prompt at a time: a request challenged while it is up waits for the same answer.
    if (answer.current) return answer.current.promise;
    let resolve: Answer["resolve"] = () => {};
    const promise = new Promise<boolean>((done) => {
      resolve = done;
    });
    answer.current = { promise, resolve };
    setPending({ action, challenge });
    return promise;
  }, []);

  const finish = useCallback((confirmed: boolean) => {
    answer.current?.resolve(confirmed);
    answer.current = null;
    setPending(null);
  }, []);

  // Requests still waiting when the app goes away get their challenged result back instead of hanging.
  useEffect(
    () => () => {
      answer.current?.resolve(false);
      answer.current = null;
    },
    [],
  );

  const withStepUp = useCallback<WithStepUp>(
    (action, request) => runWithStepUp(action, request, confirmIdentity),
    [confirmIdentity],
  );

  return (
    <StepUpContext.Provider value={withStepUp}>
      {children}
      {pending && <StepUpDialog action={pending.action} challenge={pending.challenge} onDone={finish} />}
    </StepUpContext.Provider>
  );
}

const withoutProvider: WithStepUp = (action, request) =>
  runWithStepUp(action, request, () =>
    Promise.reject(
      new Error(
        `"${action}" needs the user to confirm their identity, but no StepUpProvider is above the caller to show the dialog. The app's ApiProvider renders one.`,
      ),
    ),
  );

/**
 * `withStepUp` for the current app. With no `StepUpProvider` above the caller, requests still run, and one that
 * the server challenges rejects with an error that says so, instead of waiting for a dialog that cannot open.
 */
export function useStepUp(): WithStepUp {
  return useContext(StepUpContext) ?? withoutProvider;
}
