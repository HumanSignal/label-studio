import { inject, observer } from 'mobx-react';
import { Button } from '../../common/Button/Button';
import { Tooltip } from '../../common/Tooltip/Tooltip';
import { Block, Elem } from '../../utils/bem';
import { isDefined } from '../../utils/utilities';
import { IconBan } from '../../assets/icons';

import './Controls.styl';
import { useCallback, useMemo, useState } from 'react';

const TOOLTIP_DELAY = 0.8;

const ButtonTooltip = inject('store')(observer(({ store, title, children }) => {
  return (
    <Tooltip
      title={title}
      enabled={store.settings.enableTooltips}
      mouseEnterDelay={TOOLTIP_DELAY}
    >
      {children}
    </Tooltip>
  );
}));

const controlsInjector = inject(({ store }) => {
  return {
    store,
    history: store?.annotationStore?.selected?.history,
  };
});

export const Controls = controlsInjector(observer(({ store, history, annotation }) => {
  const isReview = store.hasInterface('review');

  const historySelected = isDefined(store.annotationStore.selectedHistory);
  const { userGenerate, sentUserGenerate, versions, results, editable } = annotation;
  const buttons = [];

  const [isInProgress, setIsInProgress] = useState(false);

  // const isReady = store.annotationStore.selected.objects.every(object => object.isReady === undefined || object.isReady);
  const disabled = !editable || store.isSubmitting || historySelected || isInProgress; // || !isReady;
  const submitDisabled = store.hasInterface('annotations:deny-empty') && results.length === 0;

  const buttonHandler = useCallback(async (e, callback, tooltipMessage) => {
    const { addedCommentThisSession, currentComment, commentFormSubmit, inputRef } = store.commentStore;

    if (isInProgress) return;
    setIsInProgress(true);
    if (!inputRef.current || addedCommentThisSession) {
      callback();
    } else if ((currentComment ?? '').trim()) {
      e.preventDefault();
      await commentFormSubmit();
      callback();
    } else {
      const commentsInput = inputRef.current;

      store.commentStore.setTooltipMessage(tooltipMessage);
      commentsInput.scrollIntoView({
        behavior: 'smooth',
      });
      commentsInput.focus({ preventScroll: true });
    }
    setIsInProgress(false);
  }, [
    store.rejectAnnotation,
    store.skipTask,
    store.commentStore.currentComment,
    store.commentStore.inputRef,
    store.commentStore.commentFormSubmit,
    store.commentStore.addedCommentThisSession,
    isInProgress,
  ]);

  const RejectButton = useMemo(() => {
    return (
      <ButtonTooltip key="reject" title="Reject annotation: [ Ctrl+Space ]">
        <Button aria-label="reject-annotation" disabled={disabled} look="danger" onClick={async (e) => {
          if (store.hasInterface('comments:reject') ?? true) {
            buttonHandler(e, () => store.rejectAnnotation({}), 'Please enter a comment before rejecting');
          } else {
            console.log('rejecting');
            await store.commentStore.commentFormSubmit();
            store.rejectAnnotation({});
          }
        }}>
          Reject
        </Button>
      </ButtonTooltip>
    );
  }, [disabled, store]);

  if (isReview) {
    buttons.push(RejectButton);

    buttons.push(
      <ButtonTooltip key="accept" title="Accept annotation: [ Ctrl+Enter ]">
        <Button aria-label="accept-annotation" disabled={disabled} look="primary" onClick={async () => {
          await store.commentStore.commentFormSubmit();
          store.acceptAnnotation();
        }}>
          {history.canUndo ? 'Fix + Accept' : 'Accept'}
        </Button>
      </ButtonTooltip>,
    );
  } else if (annotation.skipped) {
    buttons.push(
      <Elem name="skipped-info" key="skipped">
        <IconBan color="#d00" /> Was skipped
      </Elem>);
    buttons.push(
      <ButtonTooltip key="cancel-skip" title="Cancel skip: []">
        <Button aria-label="cancel-skip" disabled={disabled} look="primary" onClick={async () => {
          await store.commentStore.commentFormSubmit();
          store.unskipTask();
        }}>
          Cancel skip
        </Button>
      </ButtonTooltip>,
    );
  } else {
    if (store.hasInterface('skip')) {
      buttons.push(
        <ButtonTooltip key="skip" title="Cancel (skip) task: [ Ctrl+Space ]">
          <Button aria-label="skip-task" disabled={disabled} look="danger" onClick={async (e) => {
            if (store.hasInterface('comments:skip') ?? true) {
              buttonHandler(e, () => store.skipTask({}), 'Please enter a comment before skipping');
            } else {
              await store.commentStore.commentFormSubmit();
              store.skipTask({});
            }
          }}>
            Skip
          </Button>
        </ButtonTooltip>,
      );
    }

    if ((userGenerate && !sentUserGenerate) || (store.explore && !userGenerate && store.hasInterface('submit'))) {
      const title = submitDisabled
        ? 'Empty annotations denied in this project'
        : 'Save results: [ Ctrl+Enter ]';
      // span is to display tooltip for disabled button

      buttons.push(
        <ButtonTooltip key="submit" title={title}>
          <Elem name="tooltip-wrapper">
            <Button aria-label="submit" disabled={disabled || submitDisabled} look="primary" onClick={async () => {
              await store.commentStore.commentFormSubmit();
              store.submitAnnotation();
            }}>
              Submit
            </Button>
          </Elem>
        </ButtonTooltip>,
      );
    }

    if ((userGenerate && sentUserGenerate) || (!userGenerate && store.hasInterface('update'))) {
      const isUpdate = sentUserGenerate || versions.result;
      const button = (
        <ButtonTooltip key="update" title="Update this task: [ Alt+Enter ]">
          <Button aria-label="submit" disabled={disabled || submitDisabled} look="primary" onClick={async () => {
            await store.commentStore.commentFormSubmit();
            store.updateAnnotation();
          }}>
            {isUpdate ? 'Update' : 'Submit'}
          </Button>
        </ButtonTooltip>
      );

      buttons.push(button);
    }
  }

  return (
    <Block name="controls">
      {buttons}
    </Block>
  );
}));
