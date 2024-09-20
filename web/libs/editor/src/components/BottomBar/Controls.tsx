/**
 * This panel is used with FF_1170 + FF_3873 in new interface,
 * but it's also used in old interface with FF_3873, but without FF_1170.
 * Only this component should get interface updates, other versions should be removed.
 */

import { inject, observer } from "mobx-react";
import { type Instance } from "mobx-state-tree";
import React, { memo, ReactNode, useCallback, useState } from "react";

import { IconBan, LsChevron } from "../../assets/icons";
import { Button } from "../../common/Button/Button";
import { Dropdown } from "../../common/Dropdown/Dropdown";
import { Tooltip } from "../../common/Tooltip/Tooltip";
import { CustomButton } from "../../stores/CustomButton";
import { Block, cn, Elem } from "../../utils/bem";
import { FF_REVIEWER_FLOW, isFF } from "../../utils/feature-flags";
import { isDefined } from "../../utils/utilities";

import "./Controls.scss";

const TOOLTIP_DELAY = 0.8;

type ButtonTooltipProps = {
  title: string;
  children: JSX.Element;
};

type MixedInParams = {
  store: MSTStore;
  history: any;
}

function controlsInjector<T extends {}>(fn: (props: T & MixedInParams) => ReactNode) {
  const wrapped = inject(({ store }) => {
    return {
      store,
      history: store?.annotationStore?.selected?.history,
    };
  })(fn);
  return wrapped as unknown as (props: T) => ReactNode;
}

const ButtonTooltip = controlsInjector<ButtonTooltipProps>(
  observer(({ store, title, children }) => {
    return (
      <Tooltip title={title} enabled={store.settings.enableTooltips} mouseEnterDelay={TOOLTIP_DELAY}>
        {children}
      </Tooltip>
    );
  }),
);

type CustomControlProps = {
  button: Instance<typeof CustomButton>;
  onClick?: (name: string) => void;
};

const CustomControl = observer(({ button, onClick }: CustomControlProps) => {
  const look = button.disabled ? "disabled" : button.look;
  const [waiting, setWaiting] = useState(false);
  const clickHandler = useCallback(
    async () => {
      if (!onClick) return;
      setWaiting(true);
      await onClick?.(button.name);
      setWaiting(false);
    },
    [button],
  );
  return (
    <ButtonTooltip key={button.name} title={button.tooltip ?? ""}>
      <Button
        aria-label={button.ariaLabel}
        disabled={button.disabled}
        look={look}
        onClick={clickHandler}
        waiting={waiting}
      >
        {button.title}
      </Button>
    </ButtonTooltip>
  );
});

export const Controls = controlsInjector<{ annotation: MSTAnnotation }>(
  observer(({ store, history, annotation }) => {
    const isReview = store.hasInterface("review") || annotation.canBeReviewed;
    const isNotQuickView = store.hasInterface("topbar:prevnext");
    const historySelected = isDefined(store.annotationStore.selectedHistory);
    const { userGenerate, sentUserGenerate, versions, results, editable: annotationEditable } = annotation;
    const dropdownTrigger = cn("dropdown").elem("trigger").toClassName();
    const buttons = [];

    const [isInProgress, setIsInProgress] = useState(false);
    const disabled = !annotationEditable || store.isSubmitting || historySelected || isInProgress;
    const submitDisabled = store.hasInterface("annotations:deny-empty") && results.length === 0;

    const buttonHandler = useCallback(
      async (e: React.MouseEvent, callback: () => any, tooltipMessage: string) => {
        const { addedCommentThisSession, currentComment, commentFormSubmit } = store.commentStore;

        if (isInProgress) return;
        setIsInProgress(true);

        const selected = store.annotationStore?.selected;

        if (addedCommentThisSession) {
          selected?.submissionInProgress();
          callback();
        } else if (currentComment[annotation.id]?.trim()) {
          e.preventDefault();
          selected?.submissionInProgress();
          await commentFormSubmit();
          callback();
        } else {
          store.commentStore.setTooltipMessage(tooltipMessage);
        }
        setIsInProgress(false);
      },
      [
        store.rejectAnnotation,
        store.skipTask,
        store.commentStore.currentComment,
        store.commentStore.commentFormSubmit,
        store.commentStore.addedCommentThisSession,
        isInProgress,
      ],
    );

    // @todo memo?
    const RejectButton = memo(({ disabled, store }: { disabled: boolean, store: MSTStore }) => {
      return (
        <ButtonTooltip key="reject" title="Reject annotation: [ Ctrl+Space ]">
          <Button
            aria-label="reject-annotation"
            disabled={disabled}
            onClick={async (e) => {
              if (store.hasInterface("comments:reject") ?? true) {
                buttonHandler(e, () => store.rejectAnnotation({}), "Please enter a comment before rejecting");
              } else {
                const selected = store.annotationStore?.selected;

                selected?.submissionInProgress();
                await store.commentStore.commentFormSubmit();
                store.rejectAnnotation({});
              }
            }}
          >
            Reject
          </Button>
        </ButtonTooltip>
      );
    });

    const AcceptButton = memo(({ disabled, history, store }: { disabled: boolean, history: any, store: MSTStore }) => {
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
    });

    if (store.customButtons?.length) {
      for (const customButton of store.customButtons ?? []) {
        // @todo make a list of all internal buttons and use them here to mix custom buttons with internal ones
        if (customButton.name === "accept") {
          buttons.push(<AcceptButton disabled={disabled} history={history} store={store} />);
        } else {
          buttons.push(
            <CustomControl key={customButton.name} button={customButton} onClick={store.handleCustomButton} />,
          );
        }
      }
    } else if (isReview) {
      buttons.push(<RejectButton disabled={disabled} store={store} />);
      buttons.push(<AcceptButton disabled={disabled} history={history} store={store} />);
    } else if (annotation.skipped) {
      buttons.push(
        <Elem name="skipped-info" key="skipped">
          <IconBan color="#d00" /> Was skipped
        </Elem>,
      );
      buttons.push(
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
        </ButtonTooltip>,
      );
    } else {
      if (store.hasInterface("skip")) {
        buttons.push(
          <ButtonTooltip key="skip" title="Cancel (skip) task: [ Ctrl+Space ]">
            <Button
              aria-label="skip-task"
              disabled={disabled}
              onClick={async (e) => {
                if (store.hasInterface("comments:skip") ?? true) {
                  buttonHandler(e, () => store.skipTask({}), "Please enter a comment before skipping");
                } else {
                  const selected = store.annotationStore?.selected;

                  selected?.submissionInProgress();
                  await store.commentStore.commentFormSubmit();
                  store.skipTask({});
                }
              }}
            >
              Skip
            </Button>
          </ButtonTooltip>,
        );
      }

      const isDisabled = disabled || submitDisabled;
      const look = isDisabled ? "disabled" : "primary";

      const useExitOption = !isDisabled && isNotQuickView;

      const SubmitOption = ({ isUpdate, onClickMethod }: { isUpdate: boolean, onClickMethod: () => any}) => {
        return (
          <Button
            name="submit-option"
            look="primary"
            onClick={async (event) => {
              event.preventDefault();

              const selected = store.annotationStore?.selected;

              selected?.submissionInProgress();

              if ("URLSearchParams" in window) {
                const searchParams = new URLSearchParams(window.location.search);

                searchParams.set("exitStream", "true");
                const newRelativePathQuery = `${window.location.pathname}?${searchParams.toString()}`;

                window.history.pushState(null, "", newRelativePathQuery);
              }

              await store.commentStore.commentFormSubmit();
              onClickMethod();
            }}
          >
            {`${isUpdate ? "Update" : "Submit"} and exit`}
          </Button>
        );
      };

      if (userGenerate || (store.explore && !userGenerate && store.hasInterface("submit"))) {
        const title = submitDisabled ? "Empty annotations denied in this project" : "Save results: [ Ctrl+Enter ]";

        buttons.push(
          <ButtonTooltip key="submit" title={title}>
            <Elem name="tooltip-wrapper">
              <Button
                aria-label="submit"
                name="submit"
                disabled={isDisabled}
                look={look}
                mod={{ has_icon: useExitOption, disabled: isDisabled }}
                onClick={async (event) => {
                  if ((event.target as HTMLButtonElement).classList.contains(dropdownTrigger)) return;
                  const selected = store.annotationStore?.selected;

                  selected?.submissionInProgress();
                  await store.commentStore.commentFormSubmit();
                  store.submitAnnotation();
                }}
                icon={
                  useExitOption ? (
                    <Dropdown.Trigger
                      alignment="top-right"
                      content={<SubmitOption onClickMethod={store.submitAnnotation} isUpdate={false} />}
                    >
                      <div>
                        <LsChevron />
                      </div>
                    </Dropdown.Trigger>
                  ) : undefined
                }
              >
                Submit
              </Button>
            </Elem>
          </ButtonTooltip>,
        );
      }

      if ((userGenerate && sentUserGenerate) || (!userGenerate && store.hasInterface("update"))) {
        const isUpdate = Boolean(isFF(FF_REVIEWER_FLOW) || sentUserGenerate || versions.result);
        // no changes were made over previously submitted version — no drafts, no pending changes
        const noChanges = isFF(FF_REVIEWER_FLOW) && !history.canUndo && !annotation.draftId;
        const isUpdateDisabled = isDisabled || noChanges;
        const button = (
          <ButtonTooltip key="update" title={noChanges ? "No changes were made" : "Update this task: [ Ctrl+Enter ]"}>
            <Button
              aria-label="submit"
              name="submit"
              disabled={isUpdateDisabled}
              look={look}
              mod={{ has_icon: useExitOption, disabled: isUpdateDisabled }}
              onClick={async (event) => {
                if ((event.target as HTMLButtonElement).classList.contains(dropdownTrigger)) return;
                const selected = store.annotationStore?.selected;

                selected?.submissionInProgress();
                await store.commentStore.commentFormSubmit();
                store.updateAnnotation();
              }}
              icon={
                useExitOption ? (
                  <Dropdown.Trigger
                    alignment="top-right"
                    content={<SubmitOption onClickMethod={store.updateAnnotation} isUpdate={isUpdate} />}
                  >
                    <div>
                      <LsChevron />
                    </div>
                  </Dropdown.Trigger>
                ) : undefined
              }
            >
              {isUpdate ? "Update" : "Submit"}
            </Button>
          </ButtonTooltip>
        );

        buttons.push(button);
      }
    }

    return <Block name="controls">{buttons}</Block>;
  }),
);
