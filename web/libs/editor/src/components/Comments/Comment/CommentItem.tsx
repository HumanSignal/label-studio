import { observer } from "mobx-react";
import { type FC, useCallback, useContext, useState } from "react";
import { Tooltip } from "antd";

import { IconCheck, IconEllipsis } from "../../../assets/icons";
import { Button } from "../../../common/Button/Button";
import { Dropdown } from "../../../common/Dropdown/Dropdown";
import { Menu } from "../../../common/Menu/Menu";
import { Space } from "../../../common/Space/Space";
import { Userpic } from "../../../common/Userpic/Userpic";
import { Block, Elem } from "../../../utils/bem";
import { humanDateDiff, userDisplayName } from "../../../utils/utilities";
import { CommentFormBase } from "../CommentFormBase";
import { CommentsContext } from "./CommentsList";
import {
  NewTaxonomy,
  type TaxonomyItem,
  type SelectedItem,
  type TaxonomyPath,
} from "../../../components/NewTaxonomy/NewTaxonomy";

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
    setEditMode: (isGoingIntoEditMode: boolean) => void;
    toggleResolve: () => void;
    canResolveAny: boolean;
    unsetLink: () => {};
  };
  listComments: ({ suppressClearComments }: { suppressClearComments: boolean }) => void;
}

// TODO(jo): figure out how to get the taxonomy from the project.
// For now, just use a hardcoded string.
const taxoString = `<Taxonomy name="default">
  <TaxonomyItem value="title">
    <TaxonomyItem value="spelling" />
    <TaxonomyItem value="grammar" />
  </TaxonomyItem>
  <TaxonomyItem value="subtitle">
    <TaxonomyItem value="spelling" />
    <TaxonomyItem value="grammar" />
  </TaxonomyItem>
</Taxonomy>`;

const parseTaxonomyXML = (xmlString: string): TaxonomyItem[] => {
  // Assume that there is a single root Taxonomy element for now, which may have multiple
  // TaxonomyItem children.
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");
  const taxonomyItems: TaxonomyItem[] = [];

  const parseItems = (node: Element, depth = 0, path: string[] = []): TaxonomyItem => {
    const value = node.getAttribute("value") || "";
    const newPath = [...path, value];
    const children: TaxonomyItem[] = [];

    node.querySelectorAll(":scope > TaxonomyItem").forEach((childNode) => {
      children.push(parseItems(childNode, depth + 1, newPath));
    });

    return { label: value, children: children.length ? children : undefined, depth, path: newPath };
  };

  const taxonomyRoot = xmlDoc.querySelector("Taxonomy");
  if (taxonomyRoot) {
    taxonomyRoot.querySelectorAll(":scope > TaxonomyItem").forEach((node) => {
      taxonomyItems.push(parseItems(node));
    });
  }
  return taxonomyItems;
};

const taxoItems = parseTaxonomyXML(taxoString);

const taxoPathsToSelections = (paths: TaxonomyPath[] | null): SelectedItem[] =>
  paths
    ? paths.map((path) =>
        path.map((pathElt) => ({
          label: pathElt,
          value: pathElt,
        })),
      )
    : [];

export const CommentItem: FC<CommentItemProps> = observer(({ comment, listComments }: CommentItemProps) => {
  const {
    updatedAt,
    isEditMode,
    isConfirmDelete,
    createdAt,
    isPersisted,
    isDeleted,
    createdBy,
    text: initialText,
    regionRef,
    classifications,
    isResolved: resolved,
    updateComment,
    deleteComment,
    setConfirmMode,
    setEditMode,
    toggleResolve,
    canResolveAny,
  } = comment;
  const { startLinkingMode: _startLinkingMode, currentComment, globalLinking } = useContext(CommentsContext);
  const currentUser = window.APP_SETTINGS?.user;
  const isCreator = currentUser?.id === createdBy.id;
  const [text, setText] = useState(initialText);

  const [selections, setSelections] = useState<SelectedItem[]>(taxoPathsToSelections(classifications?.default?.values));
  const [linkingComment, setLinkingComment] = useState();
  const region = regionRef?.region;
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
          <Tooltip placement="topRight" title={new Date(time).toLocaleString()}>
            {`${isEdited ? "updated" : ""} ${humanDateDiff(time)}`}
          </Tooltip>
        </Elem>
      );
    return null;
  };

  return (
    <Block name="comment-item" mod={{ resolved }}>
      <Space spread size="medium" truncated>
        <Space size="small" truncated>
          <Elem tag={Userpic} user={createdBy} name="userpic" showUsername username={createdBy} />
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
              value={text}
              onSubmit={async (value) => {
                await updateComment(value);
                setText(value);
                await listComments({ suppressClearComments: true });
              }}
            />
          ) : isConfirmDelete ? (
            <Elem name="confirmForm">
              <Elem name="question">Are you sure?</Elem>
              <Elem name="controls">
                <Button onClick={() => deleteComment()} size="compact" look="danger" autoFocus>
                  Yes
                </Button>
                <Button onClick={() => setConfirmMode(false)} size="compact">
                  No
                </Button>
              </Elem>
            </Elem>
          ) : (
            <>
              {text}
              {hasLinkState && (
                <>
                  <Elem name="categorySelector">
                    <NewTaxonomy
                      selected={selections}
                      items={taxoItems}
                      onChange={async (_, values) => {
                        const theseSelections = taxoPathsToSelections(values);
                        await updateComment(
                          text,
                          theseSelections.length
                            ? {
                                default: {
                                  type: "taxonomy",
                                  values,
                                },
                              }
                            : null,
                        );
                        setSelections(theseSelections);
                      }}
                      options={{ pathSeparator: "/", showFullPath: true }}
                      defaultSearch={false}
                    />
                  </Elem>
                  <Elem name="linkState">
                    <LinkState linking={linking} region={region} />
                  </Elem>
                </>
              )}
            </>
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
              <Button size="small" type="text" icon={<IconEllipsis />} />
            </Dropdown.Trigger>
          )}
        </Elem>
      </Elem>
    </Block>
  );
});
