import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import { IconDragIndicator, IconEllipsisVertical, IconPlus } from "@humansignal/icons";
import { cn } from "../../../utils/bem";
import { Button, Tooltip } from "@humansignal/ui";
import { Dropdown } from "@humansignal/ui";
import Input from "../Input/Input";
import "./Tabs.scss";
import { TabsMenu } from "./TabsMenu";

const TabsContext = createContext();
export const tabsCN = cn("tabs-dm");

export const Tabs = ({
  children,
  activeTab,
  onChange,
  onAdd,
  onDragEnd,
  tabBarExtraContent,
  allowedActions,
  addIcon,
}) => {
  const [selectedTab, setSelectedTab] = useState(activeTab);

  const switchTab = useCallback((tab) => {
    setSelectedTab(tab);
    onChange?.(tab);
  }, []);

  useEffect(() => {
    if (selectedTab !== activeTab) setSelectedTab(activeTab);
  }, [selectedTab, activeTab]);

  const contextValue = useMemo(() => {
    return {
      switchTab,
      selectedTab,
      allowedActions,
      lastTab: children.length === 1,
    };
  }, [switchTab, selectedTab, allowedActions, children.length]);

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={tabsCN.toString()}>
        <div className={tabsCN.elem("list").toString()} role="tablist">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="droppable" direction="horizontal">
              {(provided) => (
                <div
                  className={tabsCN.elem("droppable").toString()}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {children}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          {allowedActions.add !== false && (
            <Tooltip title="Open New Tab">
              <Button
                className={tabsCN.elem("add").toString()}
                size="smaller"
                look="outline"
                variant="neutral"
                onClick={onAdd}
                aria-label="Open New Tab"
                data-leave
              >
                <IconPlus width={12} height={12} aria-hidden="true" />
              </Button>
            </Tooltip>
          )}
        </div>
        <div className={tabsCN.elem("extra").toString()}>{tabBarExtraContent}</div>
      </div>
    </TabsContext.Provider>
  );
};

export const TabsItem = observer(
  ({
    title,
    tab,
    onFinishEditing,
    onCancelEditing,
    onClose,
    onDuplicate,
    onSave,
    editable = true,
    deletable = true,
    managable = true,
    virtual = false,
  }) => {
    const { switchTab, selectedTab, lastTab, allowedActions } = useContext(TabsContext);
    const [currentTitle, setCurrentTitle] = useState(title);
    const [savedTitle, setSavedTitle] = useState(title); // Track the last saved title
    const [renameMode, setRenameMode] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const active = tab === selectedTab;

    // Sync with title prop on initial mount and when prop changes
    useEffect(() => {
      setCurrentTitle(title);
      setSavedTitle(title);
    }, [title]);

    const tabIsEditable = useMemo(() => editable && allowedActions.edit, [editable, allowedActions]);

    const tabIsDeletable = useMemo(
      () => !lastTab && deletable && allowedActions.delete,
      [lastTab, deletable, allowedActions],
    );

    const tabIsCloneable = useMemo(
      () => allowedActions.add && allowedActions.duplicate,
      [allowedActions.add, allowedActions.duplicate],
    );

    const showMenu = useMemo(() => {
      return !renameMode && managable && (tabIsEditable || tabIsDeletable || tabIsCloneable);
    }, [renameMode, managable, tabIsEditable, tabIsDeletable, tabIsCloneable]);

    const saveTabTitle = useCallback(
      (ev) => {
        const { type, key } = ev;
        const isBlur = type === "blur";
        const isEnter = key === "Enter";
        const isEscape = key === "Escape";

        if (isBlur || isEnter || isEscape) {
          if (isEnter || isEscape) {
            ev.preventDefault();
            ev.stopPropagation();
          }
          setRenameMode(false);

          if (isEscape) {
            setCurrentTitle(savedTitle);
            onCancelEditing?.();
            return;
          }

          // Update the saved title when user confirms the save
          setSavedTitle(currentTitle);
          onFinishEditing(currentTitle);
        }
      },
      [currentTitle, savedTitle, onCancelEditing, onFinishEditing],
    );

    const handleKeyDown = useCallback(
      (ev) => {
        if (renameMode) return;

        // Enter or Space to activate tab
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          switchTab?.(tab);
        }
      },
      [renameMode, switchTab, tab],
    );

    const tabLabel = virtual ? `${currentTitle} (unsaved)` : currentTitle;

    return (
      <div className={tabsCN.elem("item").mod({ active, virtual, menuOpen: isMenuOpen, edit: renameMode }).toString()}>
        {!renameMode && (
          <div className={tabsCN.elem("item-drag").toString()} aria-hidden="true">
            <IconDragIndicator className="w-4 h-4" />
          </div>
        )}
        <div
          className={tabsCN
            .elem("item-left")
            .mod({
              edit: renameMode,
            })
            .toString()}
          role="tab"
          aria-selected={active}
          aria-label={tabLabel}
          tabIndex={renameMode ? -1 : 0}
          onClick={() => !renameMode && switchTab?.(tab)}
          onKeyDown={handleKeyDown}
          title={currentTitle}
          data-leave
        >
          {renameMode ? (
            <Input
              size="small"
              autoFocus={true}
              value={currentTitle}
              aria-label="Tab name"
              onKeyDown={saveTabTitle}
              onBlur={saveTabTitle}
              onChange={(ev) => {
                setCurrentTitle(ev.target.value);
              }}
            />
          ) : (
            <span
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              aria-hidden="true"
            >
              {currentTitle}
            </span>
          )}
        </div>
        <div className={tabsCN.elem("item-right").toString()}>
          {showMenu && (
            <Dropdown.Trigger
              align="bottom-left"
              openUpwardForShortViewport={false}
              onToggle={setIsMenuOpen}
              content={
                <TabsMenu
                  editable={tabIsEditable}
                  closable={tabIsDeletable}
                  clonable={tabIsCloneable}
                  virtual={virtual}
                  onClick={(action) => {
                    switch (action) {
                      case "edit":
                        return setRenameMode(true);
                      case "duplicate":
                        return onDuplicate?.();
                      case "close":
                        return onClose?.();
                      case "save":
                        return onSave?.();
                    }
                  }}
                />
              }
            >
              <div className={tabsCN.elem("item-right-button").toString()}>
                <Button look="outline" size="smaller" variant="neutral" aria-label="Tab options">
                  <IconEllipsisVertical className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            </Dropdown.Trigger>
          )}
        </div>
      </div>
    );
  },
);
