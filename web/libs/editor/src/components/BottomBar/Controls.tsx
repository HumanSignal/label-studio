/**
 * This panel is used with FF_1170 + FF_3873 in new interface,
 * but it's also used in old interface with FF_3873, but without FF_1170.
 * Only this component should get interface updates, other versions should be removed.
 */

import { observer } from "mobx-react";
import type { Instance } from "mobx-state-tree";
import type React from "react";
import { useCallback, useState } from "react";

import { IconBan, LsChevron } from "../../assets/icons";
import { Button } from "../../common/Button/Button";
import { Dropdown } from "../../common/Dropdown/Dropdown";
import type { CustomButton } from "../../stores/CustomButton";
import { Block, cn, Elem } from "../../utils/bem";
import { FF_REVIEWER_FLOW, isFF } from "../../utils/feature-flags";
import { isDefined, toArray } from "../../utils/utilities";
import {
  AcceptButton,
  ButtonTooltip,
  controlsInjector,
  RejectButtonDefinition,
  SkipButton,
  UnskipButton,
} from "./buttons";

import "./Controls.scss";

type CustomButtonType = Instance<typeof CustomButton>;
// these buttons can be reused inside custom buttons or can be replaces with custom buttons
type SupportedInternalButtons = "accept" | "reject";
// special places for custom buttons — before, after or instead of internal buttons
type SpecialPlaces = "_before" | "_after" | "_replace";
// @todo should be Instance<typeof AppStore>["customButtons"] but it doesn't fit to itself
type CustomButtonsField = Map<
  SpecialPlaces | SupportedInternalButtons,
  CustomButtonType | SupportedInternalButtons | Array<CustomButtonType | SupportedInternalButtons>
>;
type ControlButtonProps = {
  button: CustomButtonType;
  disabled: boolean;
  onClick: (e: React.MouseEvent) => void;
};

/**
 * Custom action button component, rendering buttons from store.customButtons
 */
const ControlButton = observer(({ button, disabled, onClick }: ControlButtonProps) => {
  const look = button.disabled || disabled ? "disabled" : button.look;

  return (
    <ButtonTooltip title={button.tooltip ?? ""}>
      <Button aria-label={button.ariaLabel} disabled={button.disabled || disabled} look={look} onClick={onClick}>
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
    const customButtons: CustomButtonsField = store.customButtons;
    const buttons = [];

    const [isInProgress, setIsInProgress] = useState(false);
    const disabled = !annotationEditable || store.isSubmitting || historySelected || isInProgress;
    const submitDisabled = store.hasInterface("annotations:deny-empty") && results.length === 0;

    /** Check all things related to comments and then call the action if all is good */
    const handleActionWithComments = useCallback(
      async (e: React.MouseEvent, callback: () => any, errorMessage: string) => {
        const { addedCommentThisSession, currentComment, commentFormSubmit } = store.commentStore;
        const comment = currentComment[annotation.id];
        // accept both old and new comment formats
        const commentText = (comment?.text ?? comment)?.trim();

        if (isInProgress) return;
        setIsInProgress(true);

        const selected = store.annotationStore?.selected;

        if (addedCommentThisSession) {
          selected?.submissionInProgress();
          callback();
        } else if (commentText) {
          e.preventDefault();
          selected?.submissionInProgress();
          await commentFormSubmit();
          callback();
        } else {
          store.commentStore.setTooltipMessage(errorMessage);
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

    const buttonsBefore = customButtons.get("_before");
    const buttonsReplacement = customButtons.get("_replace");
    const firstToRender = buttonsReplacement ?? buttonsBefore;

    // either we render _before buttons and then the rest, or we render only _replace buttons
    if (firstToRender) {
      const allButtons = toArray(firstToRender);
      for (const customButton of allButtons) {
        // @todo make a list of all internal buttons and use them here to mix custom buttons with internal ones
        // string buttons is a way to render internal buttons
        if (typeof customButton === "string") {
          if (customButton === "accept") {
            // just an example of internal button usage
            // @todo move buttons to separate components
            buttons.push(<AcceptButton disabled={disabled} history={history} store={store} />);
          }
        } else {
          buttons.push(
            <ControlButton
              key={customButton.name}
              disabled={disabled}
              button={customButton}
              onClick={() => store.handleCustomButton?.(customButton.name)}
            />,
          );
        }
      }
    }

    if (buttonsReplacement) {
      // do nothing as all custom buttons are rendered already and we don't need internal buttons
    } else if (isReview) {
      const customRejectButtons = toArray(customButtons.get("reject"));
      const hasCustomReject = customRejectButtons.length > 0;
      const originalRejectButton = RejectButtonDefinition;
      // @todo implement reuse of internal buttons later (they are set as strings)
      const rejectButtons: CustomButtonType[] = hasCustomReject
        ? customRejectButtons.filter((button) => typeof button !== "string")
        : [originalRejectButton];

      rejectButtons.forEach((button) => {
        const action = hasCustomReject
          ? () => store.handleCustomButton?.(button.name)
          : () => store.rejectAnnotation({});

        const onReject = async (e: React.MouseEvent) => {
          const selected = store.annotationStore?.selected;

          if (store.hasInterface("comments:reject")) {
            handleActionWithComments(e, action, "Please enter a comment before rejecting");
          } else {
            selected?.submissionInProgress();
            await store.commentStore.commentFormSubmit();
            action();
          }
        };

        buttons.push(<ControlButton button={button} disabled={disabled} onClick={onReject} />);
      });
      buttons.push(<AcceptButton disabled={disabled} history={history} store={store} />);
    } else if (annotation.skipped) {
      buttons.push(
        <Elem name="skipped-info" key="skipped">
          <IconBan color="#d00" /> Was skipped
        </Elem>,
      );
      buttons.push(<UnskipButton disabled={disabled} store={store} />);
    } else {
      if (store.hasInterface("skip")) {
        const onSkipWithComment = (e: React.MouseEvent, action: () => any) => {
          handleActionWithComments(e, action, "Please enter a comment before skipping");
        };

        buttons.push(<SkipButton disabled={disabled} store={store} onSkipWithComment={onSkipWithComment} />);
      }

      const isDisabled = disabled || submitDisabled;
      const look = isDisabled ? "disabled" : "primary";

      const useExitOption = !isDisabled && isNotQuickView;

      const SubmitOption = ({ isUpdate, onClickMethod }: { isUpdate: boolean; onClickMethod: () => any }) => {
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
