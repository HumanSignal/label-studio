import { observer } from "mobx-react";
import type React from "react";
import { type FC, useCallback, useContext, useMemo, useState } from "react";
import { Tooltip, Userpic } from "@humansignal/ui";
import { IconCheck, IconEllipsis } from "@humansignal/icons";
import { Button } from "@humansignal/ui";
import { Dropdown } from "@humansignal/ui";
import { Menu } from "../../../common/Menu/Menu";
import { Space } from "../../../common/Space/Space";
import { cn } from "../../../utils/bem";
import { humanDateDiff, userDisplayName } from "../../../utils/utilities";
import { CommentFormBase } from "../CommentFormBase";
import { CommentsContext } from "./CommentsList";
import { NewTaxonomy as Taxonomy, type TaxonomyPath } from "../../../components/NewTaxonomy/NewTaxonomy";
import { taxonomyPathsToSelectedItems, COMMENT_TAXONOMY_OPTIONS } from "../../../utils/commentClassification";

import "./CommentItem.scss";
import { LinkState } from "./LinkState";

interface CommentItemProps {
  comment: {
    isEditMode: boolean;
    isConfirmDelete: boolean;
    createdAt: string;
    updatedAt: string;
    isPersisted: boolean;
    isDeleted: boolean;
    createdBy: any;
    text: string;
    regionRef: any;
    classifications: any;
    isResolved: boolean;
    updateComment: (comment: string, classifications?: any) => void;
    deleteComment: () => void;
    setConfirmMode: (confirmMode: boolean) => void;
    setClassifications: (classifications: any) => void;
    setEditMode: (isGoingIntoEditMode: boolean) => void;
    toggleResolve: () => void;
    canResolveAny: boolean;
    unsetLink: () => {};
    isHighlighted: boolean;
    setHighlighted: (value: boolean) => {};
    _commentRef: React.Ref<HTMLElement>;
  };
  listComments: ({
    suppressClearComments,
  }: {
    suppressClearComments: boolean;
  }) => void;
  classificationsItems: any;
}

export const CommentItem: FC<CommentItemProps> = observer(
  ({ comment, listComments, classificationsItems }: CommentItemProps) => {
    const {
      classifications,
      updatedAt,
      isEditMode,
      isConfirmDelete,
      createdAt,
      isPersisted,
      isDeleted,
      createdBy,
      text: initialText,
      regionRef,
      isResolved: resolved,
      updateComment,
      deleteComment,
      setConfirmMode,
      setClassifications,
      setEditMode,
      toggleResolve,
      canResolveAny,
      isHighlighted,
      setHighlighted,
      _commentRef,
    } = comment;
    const { startLinkingMode: _startLinkingMode, currentComment, globalLinking } = useContext(CommentsContext);
    const currentUser = window.APP_SETTINGS?.user;
    const isCreator = currentUser?.id === createdBy.id;
    const infoIsHidden = comment.commentsStore?.store?.hasInterface("annotations:hide-info");
    const hiddenUser = infoIsHidden ? { email: isCreator ? "Me" : "User" } : null;
    const [text, setText] = useState(initialText);

    const [linkingComment, setLinkingComment] = useState();
    const region = regionRef?.region;
    const result = regionRef?.result;
    const linking = !!(linkingComment && currentComment === linkingComment && globalLinking);
    const hasLinkState = linking || region;

    const startLinkingMode = useCallback(
      (comment: any) => {
        setLinkingComment(comment);
        _startLinkingMode(comment);
      },
      [_startLinkingMode],
    );

    const toggleLink = useCallback(() => {
      if (regionRef?.region) {
        comment.unsetLink();
      } else {
        startLinkingMode(comment);
      }
    }, [comment, startLinkingMode, regionRef?.region]);

    const taxonomyOnChange = useCallback(
      async (_: Node, values: TaxonomyPath[]) => {
        const newClassifications =
          values.length > 0
            ? {
                default: {
                  type: "taxonomy",
                  values,
                },
              }
            : null;
        setClassifications(newClassifications);
      },
      [setClassifications],
    );

    const taxonomySelectedItems = useMemo(
      () => taxonomyPathsToSelectedItems(classifications?.default?.values),
      [classifications],
    );

    const commentFormBaseOnSubmit = useCallback(
      async (value: any) => {
        await updateComment(value, classifications);
        setText(value);
        await listComments({ suppressClearComments: true });
      },
      [updateComment, listComments, classifications],
    );

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
          <div className={cn("comment-item").elem("date").toClassName()}>
            <Tooltip alignment="top-right" title={new Date(time).toLocaleString()}>
              <span>{`${isEdited ? "updated" : ""} ${humanDateDiff(time)}`}</span>
            </Tooltip>
          </div>
        );
      return null;
    };

    return (
      <div
        className={cn("comment-item").mod({ resolved, highlighted: isHighlighted }).toClassName()}
        onMouseEnter={() => {
          setHighlighted(true);
        }}
        onMouseLeave={() => {
          setHighlighted(false);
        }}
        ref={_commentRef as any}
      >
        <Space spread size="medium" truncated>
          <Space size="small" truncated>
            <Userpic
              className={cn("comment-item").elem("userpic").toClassName()}
              user={hiddenUser ?? createdBy}
              showUsernameTooltip
              username={createdBy}
            />
            <span className={cn("comment-item").elem("name").toClassName()}>
              {userDisplayName(hiddenUser ?? createdBy)}
            </span>
          </Space>

          <Space size="small">
            <IconCheck className={cn("comment-item").elem("resolved").toClassName()} />
            <div className={cn("comment-item").elem("saving").mod({ hide: isPersisted }).toClassName()}>
              <div className={cn("comment-item").elem("dot").toClassName()} />
            </div>
            {!infoIsHidden && <TimeTracker />}
          </Space>
        </Space>

        <div className={cn("comment-item").elem("content").toClassName()}>
          <div className={cn("comment-item").elem("text").toClassName()}>
            {isEditMode ? (
              <>
                <CommentFormBase value={text} onSubmit={commentFormBaseOnSubmit} classifications={classifications} />
                {classificationsItems.length > 0 && (
                  <div className={cn("comment-item").elem("classifications-row").toClassName()}>
                    <Taxonomy
                      selected={taxonomySelectedItems}
                      items={classificationsItems}
                      onChange={taxonomyOnChange}
                      options={COMMENT_TAXONOMY_OPTIONS}
                    />
                  </div>
                )}
              </>
            ) : isConfirmDelete ? (
              <div className={cn("comment-item").elem("confirmForm").toClassName()}>
                <div className={cn("comment-item").elem("question").toClassName()}>Are you sure?</div>
                <div className={cn("comment-item").elem("controls").toClassName()}>
                  <Button
                    onClick={() => deleteComment()}
                    size="small"
                    look="danger"
                    autoFocus
                    aria-label="Delete comment"
                  >
                    Yes
                  </Button>
                  <Button onClick={() => setConfirmMode(false)} size="small" aria-label="Cancel delete">
                    No
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {classifications?.default?.values?.length > 0 && (
                  <ul className={cn("comment-item").elem("classifications").toClassName()}>
                    {classifications?.default?.values?.map((valueArray: string[], index: number) => (
                      <li key={index}>{valueArray.join("/")}</li>
                    ))}
                  </ul>
                )}
                {text}
                {hasLinkState && (
                  <div className={cn("comment-item").elem("linkState").toClassName()}>
                    <LinkState linking={linking} region={region} result={result} interactive />
                  </div>
                )}
              </>
            )}
          </div>

          <div
            className={cn("comment-item").elem("actions").toClassName()}
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
                              setText(initialText);
                            }
                          }}
                        >
                          {isEditMode ? "Cancel edit" : "Edit"}
                        </Menu.Item>
                        <Menu.Item onClick={toggleLink}>{regionRef?.region ? "Unlink" : "Link to..."}</Menu.Item>
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
                <Button size="small" look="string" icon={<IconEllipsis />} aria-label="Comment options" />
              </Dropdown.Trigger>
            )}
          </div>
        </div>
      </div>
    );
  },
);
