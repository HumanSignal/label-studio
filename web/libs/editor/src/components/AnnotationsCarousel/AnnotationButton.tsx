import { Block, Elem } from '../../utils/bem';
import { Userpic } from '../../common/Userpic/Userpic';
import { IconAnnotationGroundTruth, IconAnnotationSkipped2, IconDraftCreated2, IconDuplicate, IconEllipsis, IconTrashRect, LsCommentResolved, LsCommentUnresolved, LsSparks, LsStar, LsStarOutline } from '../../assets/icons';
import { userDisplayName } from '../../utils/utilities'; 
import { TimeAgo }  from '../../common/TimeAgo/TimeAgo';
import './AnnotationButton.styl';
import { useCallback, useEffect, useState } from 'react';
import { Dropdown } from '../../common/Dropdown/Dropdown';
import { useDropdown } from '../../common/Dropdown/DropdownTrigger';
import { isDefined } from '../../utils/utilities';
import { Tooltip } from './../../common/Tooltip/Tooltip';


// eslint-disable-next-line
// @ts-ignore
import { confirm } from '../../common/Modal/Modal';
import { observer } from 'mobx-react';
interface AnnotationButtonInterface {
  entity?: any;
  capabilities?: any;
  annotationStore?: any;
  onAnnotationChange?: () => void;
}

const renderCommentIcon = (ent : any) => {
  if (ent.unresolved_comment_count > 0) {
    return LsCommentUnresolved;
  } else if (ent.comment_count > 0) {
    return LsCommentResolved;
  }

  return null;
};

const renderCommentTooltip = (ent : any) => {
  if (ent.unresolved_comment_count > 0) {
    return 'Unresolved Comments';
  } else if (ent.comment_count > 0) {
    return 'All Comments Resolved';
  }

  return '';
};

export const AnnotationButton = observer(({ entity, capabilities, annotationStore, onAnnotationChange }: AnnotationButtonInterface) => {
  const iconSize = 37;
  const isPrediction = entity.type === 'prediction';
  const username = userDisplayName(entity.user ?? {
    firstName: entity.createdBy || 'Admin',
  });
  const [isGroundTruth, setIsGroundTruth] = useState<boolean>();
  const [isContextMenuOpen, setIsContextMenuOpen] = useState<boolean>(false);

  const CommentIcon = renderCommentIcon(entity);
  // need to find a more reliable way to grab this value
  // const historyActionType = annotationStore.history.toJSON()?.[0]?.actionType;

  useEffect(() => {
    setIsGroundTruth(entity.ground_truth);
  }, [entity, entity.ground_truth]);

  const clickHandler = useCallback(() => {
    const { selected, id, type } = entity;

    if (!selected) {
      if (type === 'prediction') {
        annotationStore.selectPrediction(id);
      } else {
        annotationStore.selectAnnotation(id);
      }
    }
  }, [entity]);
  const ContextMenu = ({ entity, capabilities }: AnnotationButtonInterface) => {
    const dropdown = useDropdown();
    const clickHandler = () => {
      onAnnotationChange?.();
      dropdown?.close();
    };
    const setGroundTruth = useCallback(() => {
      entity.setGroundTruth(!isGroundTruth);
      clickHandler();
    }, [entity]);
    const duplicateAnnotation = useCallback(() => {
      const c = annotationStore.addAnnotationFromPrediction(entity);

      window.setTimeout(() => {
        annotationStore.selectAnnotation(c.id);
        clickHandler();
      });
    }, [entity]);
    const deleteAnnotation = useCallback(() => {
      clickHandler();
      confirm({
        title: 'Delete annotation?',
        body: (
          <>
            This will <strong>delete all existing regions</strong>. Are you sure you want to delete them?<br/>
            This action cannot be undone.
          </>
        ),
        buttonLook: 'destructive',
        okText: 'Delete',
        onOk: () => {
          entity.list.deleteAnnotation(entity);
        },
      });
    }, [entity]);
    const isPrediction = entity.type === 'prediction';
    const isDraft = !isDefined(entity.pk);
    const showGroundTruth = capabilities.groundTruthEnabled && !isPrediction && !isDraft;
    const showDuplicateAnnotation = capabilities.enableCreateAnnotation && !isDraft;

    return (
      <Block name="AnnotationButtonContextMenu">
        {showGroundTruth && (
          <Elem name="option" mod={{ groundTruth: true }} onClick={setGroundTruth}>
            {isGroundTruth ? (
              <>
                <LsStar color="#FFC53D" width={iconSize} height={iconSize} /> {'Unset ' }
              </>
            ) : (
              <>
                <LsStarOutline width={iconSize} height={iconSize} />{'Set '}
              </>
            )}
            as Ground Truth
          </Elem>
        )}
        {showDuplicateAnnotation && (
          <Elem name="option" mod={{ duplicate: true }} onClick={duplicateAnnotation}>
            <Elem name="icon">
              <IconDuplicate width={20} height={24} />
            </Elem>
            Duplicate Annotation
          </Elem>
        )}
        {capabilities.enableAnnotationDelete && !isPrediction && (
          <>
            <Elem name="seperator"></Elem>
            <Elem name="option" mod={{ delete: true }} onClick={deleteAnnotation}>
              <Elem name="icon">
                <IconTrashRect width={14} height={18} />
              </Elem>{' '}
              Delete Annotation
            </Elem>
          </>
        )}
      </Block>
    );
  };

  return (
    <Block name='annotation-button' mod={{ selected: entity.selected, contextMenuOpen: isContextMenuOpen }}>
      <Elem name='mainSection' onClick={clickHandler}>
        <Elem name='picSection'>
          <Elem
            name="userpic"
            tag={Userpic}
            showUsername
            username={isPrediction ? entity.createdBy : null}
            user={entity.user ?? { email: entity.createdBy }}
            mod={{ prediction: isPrediction }}
            size={24}
          >
            {isPrediction && <LsSparks style={{ width: 18, height: 18 }}/>}
          </Elem>
          {/* to do: return these icons when we have a better way to grab the history action type */}
          {/* {historyActionType === 'accepted' && <Elem name='status' mod={{ approved: true }}><IconCheckBold /></Elem>}
          {historyActionType && (
            <Elem name='status' mod={{ skipped: true }}>
              <IconCrossBold />
            </Elem>
          )}
          {entity.history.canUndo && (
            <Elem name='status' mod={{ updated: true }}>
              <IconCheckBold />
            </Elem>
          )} */}
        </Elem>
        <Elem name='main'>
          <Elem name="user">
            <Elem tag="span" name="name">{username}</Elem>
            <Elem tag="span" name="entity-id">#{entity.pk ?? entity.id}</Elem>
          </Elem>
          <Elem name="created">
            <Elem name="date" component={TimeAgo} date={entity.createdDate}/>
          </Elem>
        </Elem>
        {!isPrediction && (
          <Elem name='icons'>
            {entity.draftId > 0 && (
              <Tooltip title={'Draft'}>
                <Elem name='icon' mod={{ draft: true }}><IconDraftCreated2 color='#0099FF'/></Elem>
              </Tooltip>
            )}
            {entity.skipped && (
              <Tooltip title={'Skipped'}>
                <Elem name='icon' mod={{ skipped: true }}><IconAnnotationSkipped2 color='#DD0000' /></Elem>
              </Tooltip>
            )}
            {isGroundTruth && (
              <Tooltip title={'Ground-truth'}>
                <Elem name='icon' mod={{ groundTruth: true }}><IconAnnotationGroundTruth /></Elem>
              </Tooltip>
            )}
            {CommentIcon && (
              <Tooltip title={renderCommentTooltip(entity)}>
                <Elem name='icon' mod={{ comments: true }}><CommentIcon /></Elem>
              </Tooltip>
            )}
          </Elem>
        )}
      </Elem>
      <Elem name='contextMenu'>
        <Dropdown.Trigger
          content={<ContextMenu entity={entity} capabilities={capabilities} annotationStore={annotationStore} />}
          onToggle={(isVisible)=> setIsContextMenuOpen(isVisible)}
        >
          <Elem name='ellipsisIcon'>
            <IconEllipsis width={28} height={28}/>
          </Elem>
        </Dropdown.Trigger>
      </Elem>
    </Block>
  );
});
