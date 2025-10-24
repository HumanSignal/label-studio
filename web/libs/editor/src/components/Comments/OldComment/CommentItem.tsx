import { observer } from "mobx-react";
import { type FC, useState } from "react";
import { Tooltip, Userpic, Button } from "@humansignal/ui";
import { IconCheck, IconEllipsis } from "@humansignal/icons";
import { Space } from "../../../common/Space/Space";
import { Dropdown } from "../../../common/Dropdown/Dropdown";
import { Menu } from "../../../common/Menu/Menu";
import { Block, Elem } from "../../../utils/bem";
import { humanDateDiff, userDisplayName } from "../../../utils/utilities";
import { CommentFormBase } from "../CommentFormBase";

import "./CommentItem.scss";

interface Comment {
  comment: {
    isEditMode: boolean;
    isConfirmDelete: boolean;
    createdAt: string;
    updatedAt: string;
    isPersisted: boolean;
    isDeleted: boolean;
    createdBy: any;
    text: string;
    isResolved: boolean;
    updateComment: (comment: string) => void;
    deleteComment: () => void;
    setConfirmMode: (confirmMode: boolean) => void;
    setEditMode: (isGoingIntoEditMode: boolean) => void;
    toggleResolve: () => void;
    canResolveAny: boolean;
  };
  listComments: ({ suppressClearComments }: { suppressClearComments: boolean }) => void;
}

export const CommentItem: FC<any> = observer(
  ({
    comment: {
      updatedAt,
      isEditMode,
      isConfirmDelete,
      createdAt,
      isPersisted,
      isDeleted,
      createdBy,
      text: initialComment,
      isResolved: resolved,
      updateComment,
      deleteComment,
      setConfirmMode,
      setEditMode,
      toggleResolve,
      canResolveAny,
    },
    listComments,
  }: Comment) => {
    const currentUser = window.APP_SETTINGS?.user;
    const isCreator = currentUser?.id === createdBy.id;
    const [currentComment, setCurrentComment] = useState(initialComment);

    if (isDeleted) return null;

    const TimeTracker = () => {
      const editedTimeAchondritic = new Date(updatedAt);
      const createdTimeAchondritic = new Date(createdAt);

      editedTimeAchondritic.setMilliseconds(0);
      createdTimeAchondritic.setMilliseconds(0);

      const isEdited = editedTimeAchondritic > createdTimeAchondritic;
      const time = isEdited ? updatedAt : createdAt;

      if (isPersisted && time)
        return (
          <Elem name="date">
            <Tooltip alignment="top-right" title={new Date(time).toLocaleString()}>
              <span>{`${isEdited ? "updated" : ""} ${humanDateDiff(time)}`}</span>
            </Tooltip>
          </Elem>
        );
      return null;
    };

    return (
      <Block name="comment-item" mod={{ resolved }}>
        <Space spread size="medium" truncated>
          <Space size="small" truncated>
            <Elem tag={Userpic} user={createdBy} name="userpic" showUsernameTooltip username={createdBy} />
            <Elem name="name" tag="span">
              {userDisplayName(createdBy)}
            </Elem>
          </Space>

          <Space size="small">
            <Elem name="resolved" component={IconCheck} />
            <Elem name="saving" mod={{ hide: isPersisted }}>
              <Elem name="dot" />
            </Elem>
            <TimeTracker />
          </Space>
        </Space>

        <Elem name="content">
          <Elem name="text">
            {isEditMode ? (
              <CommentFormBase
                value={currentComment}
                onSubmit={async (value) => {
                  await updateComment(value);
                  setCurrentComment(value);
                  await listComments({ suppressClearComments: true });
                }}
              />
            ) : isConfirmDelete ? (
              <Elem name="confirmForm">
                <Elem name="question">Are you sure?</Elem>
                <Elem name="controls">
                  <Button
                    onClick={() => deleteComment()}
                    size="small"
                    variant="negative"
                    look="outlined"
                    autoFocus
                    aria-label="Delete comment"
                  >
                    Yes
                  </Button>
                  <Button
                    onClick={() => setConfirmMode(false)}
                    size="small"
                    look="outlined"
                    aria-label="Cancel comment deletion"
                  >
                    No
                  </Button>
                </Elem>
              </Elem>
            ) : (
              <>{currentComment}</>
            )}
          </Elem>

          <Elem
            name="actions"
            onClick={(e: any) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            {isPersisted && (isCreator || canResolveAny) && (
              <Dropdown.Trigger
                content={
                  <Menu size="auto">
                    <Menu.Item onClick={toggleResolve}>{resolved ? "Unresolve" : "Resolve"}</Menu.Item>
                    {isCreator && (
                      <>
                        <Menu.Item
                          onClick={() => {
                            const isGoingIntoEditMode = !isEditMode;

                            setEditMode(isGoingIntoEditMode);
                            if (!isGoingIntoEditMode) {
                              setCurrentComment(initialComment);
                            }
                          }}
                        >
                          {isEditMode ? "Cancel edit" : "Edit"}
                        </Menu.Item>
                        {!isConfirmDelete && (
                          <Menu.Item
                            onClick={() => {
                              setConfirmMode(true);
                            }}
                          >
                            Delete
                          </Menu.Item>
                        )}
                      </>
                    )}
                  </Menu>
                }
              >
                <Button size="small" look="string" leading={<IconEllipsis />} aria-label="Comment options" />
              </Dropdown.Trigger>
            )}
          </Elem>
        </Elem>
      </Block>
    );
  },
);
