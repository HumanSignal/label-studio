/**
 * @deprecated It was used only without FF_3873 in old interface.
 */

import { inject, observer } from "mobx-react";
import { IconBan, IconInfoOutline } from "@humansignal/icons";
import { Button, Tooltip } from "@humansignal/ui";
import { cn } from "../../utils/bem";
import { isDefined } from "../../utils/utilities";

import "./Controls.scss";
import { useCallback, useMemo, useState } from "react";

const TOOLTIP_DELAY = 0.8;

const ButtonTooltip = inject("store")(
  observer(({ store, title, children }) => {
    return (
      <Tooltip title={title} disabled={!store.settings.enableTooltips}>
        {children}
      </Tooltip>
    );
  }),
);

const controlsInjector = inject(({ store }) => {
  return {
    store,
    history: store?.annotationStore?.selected?.history,
  };
});

export const Controls = controlsInjector(
  observer(({ store, history, annotation }) => {
    const isReview = store.hasInterface("review");

    const historySelected = isDefined(store.annotationStore.selectedHistory);
    const { userGenerate, sentUserGenerate, versions, results, editable } = annotation;
    const buttons = [];

    const [isInProgress, setIsInProgress] = useState(false);

    // const isReady = store.annotationStore.selected.objects.every(object => object.isReady === undefined || object.isReady);
    const disabled = !editable || store.isSubmitting || historySelected || isInProgress; // || !isReady;
    const submitDisabled = store.hasInterface("annotations:deny-empty") && results.length === 0;

    const buttonHandler = useCallback(
      async (e, callback, tooltipMessage) => {
        const { addedCommentThisSession, currentComment, commentFormSubmit, inputRef } = store.commentStore;

        if (isInProgress) return;
        setIsInProgress(true);
        if (!inputRef.current || addedCommentThisSession) {
          callback();
        } else if ((currentComment ?? "").trim()) {
          e.preventDefault();
          await commentFormSubmit();
          callback();
        } else {
          const commentsInput = inputRef.current;

          store.commentStore.setTooltipMessage(tooltipMessage);
          commentsInput.scrollIntoView({
            behavior: "smooth",
          });
          commentsInput.focus({ preventScroll: true });
        }
        setIsInProgress(false);
      },
      [
        store.rejectAnnotation,
        store.skipTask,
        store.commentStore.currentComment,
        store.commentStore.inputRef,
        store.commentStore.commentFormSubmit,
        store.commentStore.addedCommentThisSession,
        isInProgress,
      ],
    );

    const RejectButton = useMemo(() => {
      return (
        <ButtonTooltip key="reject" title="Reject annotation: [ Ctrl+Space ]">
          <Button
            aria-label="Reject current annotation"
            disabled={disabled}
            look="danger"
            onClick={async (e) => {
              if (store.hasInterface("comments:reject") ?? true) {
                buttonHandler(e, () => store.rejectAnnotation({}), "Please enter a comment before rejecting");
              } else {
                console.log("rejecting");
                await store.commentStore.commentFormSubmit();
                store.rejectAnnotation({});
              }
            }}
          >
            Reject
          </Button>
        </ButtonTooltip>
      );
    }, [disabled, store]);

    if (isReview) {
      buttons.push(RejectButton);

      buttons.push(
        <ButtonTooltip key="accept" title="Accept annotation: [ Ctrl+Enter ]">
          <Button
            aria-label="Accept current annotation"
            disabled={disabled}
            look="primary"
            onClick={async () => {
              await store.commentStore.commentFormSubmit();
              store.acceptAnnotation();
            }}
          >
            {history.canUndo || annotation.versions.draft ? "Fix + Accept" : "Accept"}
          </Button>
        </ButtonTooltip>,
      );
    } else if (annotation.skipped) {
      buttons.push(
        <div className={cn("controls").elem("skipped-info").toClassName()} key="skipped">
          <IconBan color="#d00" /> Was skipped
        </div>,
      );
      buttons.push(
        <ButtonTooltip key="cancel-skip" title="Cancel skip: []">
          <Button
            aria-label="Cancel skip and return to annotation"
            disabled={disabled}
            look="outlined"
            onClick={async () => {
              await store.commentStore.commentFormSubmit();
              store.unskipTask();
            }}
          >
            Cancel skip
          </Button>
        </ButtonTooltip>,
      );
    } else {
      // Manager roles that can force-skip unskippable tasks (OW=Owner, AD=Admin, MA=Manager)
      const MANAGER_ROLES = ["OW", "AD", "MA"];

      if (store.hasInterface("skip")) {
        const task = store.task;

        const isEnterprise = window.APP_SETTINGS?.billing?.enterprise;
        const skipDisabled = isEnterprise ? task?.allow_skip === false : false;
        const userRole = window.APP_SETTINGS?.user?.role;
        const hasForceSkipPermission = MANAGER_ROLES.includes(userRole);
        const canSkip = !skipDisabled || hasForceSkipPermission;
        const isDisabled = disabled || !canSkip;

        const tooltip = canSkip ? "Cancel (skip) task: [ Ctrl+Space ]" : "This task cannot be skipped";

        const showInfoIcon = skipDisabled && hasForceSkipPermission;

        if (showInfoIcon) {
          buttons.push(
            <Tooltip key="skip-info" title="Annotators and Reviewers will not be able to skip this task">
              <IconInfoOutline width={20} height={20} className="text-neutral-content ml-auto cursor-pointer" />
            </Tooltip>,
          );
        }

        buttons.push(
          <ButtonTooltip key="skip" title={tooltip}>
            <Button
              aria-label="Skip current task"
              disabled={isDisabled}
              variant="negative"
              look="outlined"
              onClick={async (e) => {
                if (!canSkip) return;
                if (store.hasInterface("comments:skip") ?? true) {
                  buttonHandler(e, () => store.skipTask({}), "Please enter a comment before skipping");
                } else {
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

      if ((userGenerate && !sentUserGenerate) || (store.explore && !userGenerate && store.hasInterface("submit"))) {
        const title = submitDisabled ? "Empty annotations denied in this project" : "Save results: [ Ctrl+Enter ]";
        // span is to display tooltip for disabled button

        buttons.push(
          <ButtonTooltip key="submit" title={title}>
            <div className={cn("controls").elem("tooltip-wrapper").toClassName()}>
              <Button
                aria-label="Submit current annotation"
                disabled={disabled || submitDisabled}
                look="primary"
                onClick={async () => {
                  await store.commentStore.commentFormSubmit();
                  store.submitAnnotation();
                }}
              >
                Submit
              </Button>
            </div>
          </ButtonTooltip>,
        );
      }

      if ((userGenerate && sentUserGenerate) || (!userGenerate && store.hasInterface("update"))) {
        const isUpdate = sentUserGenerate || versions.result;
        const button = (
          <ButtonTooltip key="update" title="Update this task: [ Alt+Enter ]">
            <Button
              aria-label="Update current annotation"
              disabled={disabled || submitDisabled}
              look="primary"
              onClick={async () => {
                await store.commentStore.commentFormSubmit();
                store.updateAnnotation();
              }}
            >
              {isUpdate ? "Update" : "Submit"}
            </Button>
          </ButtonTooltip>
        );

        buttons.push(button);
      }
    }

    return (
      <div className={cn("controls").toClassName()}>
        <div className="grid grid-flow-col auto-cols-fr gap-tight items-center">{buttons}</div>
      </div>
    );
  }),
);
