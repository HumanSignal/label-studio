/**
 * Buttons for the bottom bar. Defined separately so the logic code is more readable.
 * Also they can be reused in custom buttons.
 * `on*OnComment()` are used for actions with comment attached to them.
 */

import { inject, observer } from "mobx-react";
import type React from "react";
import { memo, type ReactNode } from "react";
import { Button } from "../../common/Button/Button";
import { Tooltip } from "../../common/Tooltip/Tooltip";

type MixedInParams = {
  store: MSTStore;
  history: any;
};

export function controlsInjector<T extends {}>(fn: (props: T & MixedInParams) => ReactNode) {
  const wrapped = inject(({ store }) => {
    return {
      store,
      history: store?.annotationStore?.selected?.history,
    };
  })(fn);
  // inject type doesn't handle the injected props, so we have to force cast it
  return wrapped as unknown as (props: T) => ReactNode;
}

const TOOLTIP_DELAY = 0.8;

type ButtonTooltipProps = {
  title: string;
  children: JSX.Element;
};

export const ButtonTooltip = controlsInjector<ButtonTooltipProps>(
  observer(({ store, title, children }) => {
    return (
      <Tooltip title={title} enabled={store.settings.enableTooltips} mouseEnterDelay={TOOLTIP_DELAY}>
        {children}
      </Tooltip>
    );
  }),
);

type AcceptButtonProps = {
  disabled: boolean;
  history: any;
  store: MSTStore;
};

export const AcceptButton = memo(
  observer(({ disabled, history, store }: AcceptButtonProps) => {
    return (
      <ButtonTooltip key="accept" title="Accept annotation: [ Ctrl+Enter ]">
        <Button
          aria-label="accept-annotation"
          disabled={disabled}
          look="primary"
          onClick={async () => {
            const selected = store.annotationStore?.selected;

            selected?.submissionInProgress();
            await store.commentStore.commentFormSubmit();
            store.acceptAnnotation();
          }}
        >
          {history.canUndo ? "Fix + Accept" : "Accept"}
        </Button>
      </ButtonTooltip>
    );
  }),
);

export const RejectButtonDefinition = {
  id: "reject",
  name: "reject",
  title: "Reject",
  look: undefined,
  ariaLabel: "reject-annotation",
  tooltip: "Reject annotation: [ Ctrl+Space ]",
  // @todo we need this for types compatibility, but better to fix CustomButtonType
  disabled: false,
};

type SkipButtonProps = {
  disabled: boolean;
  store: MSTStore;
  /**
   * Handler wrapper for skip with required comment,
   * conditions are checked in wrapper and if all good the `action` is called.
   **/
  onSkipWithComment: (event: React.MouseEvent, action: () => any) => void;
};

export const SkipButton = memo(
  observer(({ disabled, store, onSkipWithComment }: SkipButtonProps) => {
    return (
      <ButtonTooltip key="skip" title="Cancel (skip) task: [ Ctrl+Space ]">
        <Button
          aria-label="skip-task"
          disabled={disabled}
          onClick={async (e) => {
            const action = () => store.skipTask({});
            const selected = store.annotationStore?.selected;

            if (store.hasInterface("comments:skip") ?? true) {
              onSkipWithComment(e, action);
            } else {
              selected?.submissionInProgress();
              await store.commentStore.commentFormSubmit();
              store.skipTask({});
            }
          }}
        >
          Skip
        </Button>
      </ButtonTooltip>
    );
  }),
);

export const UnskipButton = memo(
  observer(({ disabled, store }: { disabled: boolean; store: MSTStore }) => {
    return (
      <ButtonTooltip key="cancel-skip" title="Cancel skip: []">
        <Button
          aria-label="cancel-skip"
          disabled={disabled}
          look="primary"
          onClick={async () => {
            const selected = store.annotationStore?.selected;

            selected?.submissionInProgress();
            await store.commentStore.commentFormSubmit();
            store.unskipTask();
          }}
        >
          Cancel skip
        </Button>
      </ButtonTooltip>
    );
  }),
);
