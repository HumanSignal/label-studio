import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import { DotsThreeVerticalIcon, DotsSixVerticalIcon, IconLockLocked, PlusIcon } from "@humansignal/icons";
import { cn } from "../../../utils/bem";
import { Button, Tooltip } from "@humansignal/ui";
import { Dropdown } from "@humansignal/ui";
import Input from "../Input/Input";
import "./Tabs.prefix.css";
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
  const { t } = useTranslation();
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
      <div className={tabsCN.toClassName()}>
        <div className={tabsCN.elem("list").toClassName()} role="tablist">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="droppable" direction="horizontal">
              {(provided) => (
                <div
                  className={tabsCN.elem("droppable").toClassName()}
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
            <Tooltip title={t("dataManager:openNewTab")} alignment="bottom-center">
              <Button
                className={tabsCN.elem("add").toClassName()}
                size="smaller"
                look="outline"
                variant="neutral"
                onClick={onAdd}
                aria-label={t("dataManager:openNewTab")}
                data-leave
                data-testid="dm-add-tab"
              >
                <PlusIcon size={16} weight="bold" aria-hidden="true" />
              </Button>
            </Tooltip>
          )}
        </div>
        <div className={tabsCN.elem("extra").toClassName()}>{tabBarExtraContent}</div>
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
    onToggleLock,
    isLocked = false,
    lockedTooltip,
    editable = true,
    deletable = true,
    managable = true,
    virtual = false,
  }) => {
    const { switchTab, selectedTab, lastTab, allowedActions } = useContext(TabsContext);
    const { t } = useTranslation();
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
    const tabIsLockable = useMemo(() => !virtual && allowedActions.lock, [allowedActions.lock, virtual]);

    const showMenu = useMemo(() => {
      return !renameMode && managable && (tabIsEditable || tabIsDeletable || tabIsCloneable || tabIsLockable);
    }, [renameMode, managable, tabIsEditable, tabIsDeletable, tabIsCloneable, tabIsLockable]);

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

    // Known default tab titles are persisted English data; map them for display only.
    const displayTitle = useMemo(() => {
      if (currentTitle === "Tasks") return t("dataManager:tabTitleTasks");
      if (currentTitle === "Default") return t("dataManager:tabTitleDefault");
      return currentTitle;
    }, [currentTitle, t]);

    const tabLabel = virtual ? t("dataManager:unsavedTabTitle", { title: displayTitle }) : displayTitle;

    const tabTooltipTitle = useMemo(() => {
      return isLocked ? `${tabLabel} · ${lockedTooltip ?? t("dataManager:lockedTabShort")}` : tabLabel;
    }, [isLocked, tabLabel, lockedTooltip, t]);

    return (
      <div
        className={tabsCN
          .elem("item")
          .mod({ active, virtual, locked: isLocked, menuOpen: isMenuOpen, edit: renameMode })
          .toClassName()}
      >
        {!renameMode && (
          <div className={tabsCN.elem("item-drag").toClassName()} aria-hidden="true">
            <DotsSixVerticalIcon className="w-4 h-4" />
          </div>
        )}
        <Tooltip title={renameMode ? undefined : tabTooltipTitle} alignment="bottom-center">
          <div
            className={tabsCN
              .elem("item-left")
              .mod({
                edit: renameMode,
              })
              .toClassName()}
            role="tab"
            aria-selected={active}
            aria-label={tabTooltipTitle}
            tabIndex={renameMode ? -1 : 0}
            onClick={() => !renameMode && switchTab?.(tab)}
            onKeyDown={handleKeyDown}
            data-testid="dm-tab"
            data-tab-title={currentTitle}
            data-leave
          >
            {renameMode ? (
              <Input
                size="small"
                autoFocus={true}
                data-testid="dm-tab-name-input"
                value={currentTitle}
                aria-label={t("dataManager:tabName")}
                onKeyDown={saveTabTitle}
                onBlur={saveTabTitle}
                onChange={(ev) => {
                  setCurrentTitle(ev.target.value);
                }}
              />
            ) : (
              <>
                {isLocked && (
                  <div
                    className={tabsCN.elem("item-lock").toClassName()}
                    aria-hidden="true"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <IconLockLocked />
                  </div>
                )}
                <span className={tabsCN.elem("item-title").toClassName()} aria-hidden="true">
                  {displayTitle}
                </span>
              </>
            )}
          </div>
        </Tooltip>
        <div className={tabsCN.elem("item-right").toClassName()}>
          {showMenu && (
            <Dropdown.Trigger
              key={isLocked ? "locked-menu" : "unlocked-menu"}
              align="bottom-left"
              openUpwardForShortViewport={false}
              onToggle={setIsMenuOpen}
              content={
                <TabsMenu
                  key={isLocked ? "locked" : "unlocked"}
                  editable={tabIsEditable}
                  closable={tabIsDeletable}
                  clonable={tabIsCloneable}
                  lockable={tabIsLockable}
                  locked={isLocked}
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
                      case "lock":
                        return onToggleLock?.();
                    }
                  }}
                />
              }
            >
              <div className={tabsCN.elem("item-right-button").toClassName()}>
                <Button
                  look="outline"
                  size="smaller"
                  variant="neutral"
                  aria-label={t("dataManager:tabOptions")}
                  data-testid="dm-tab-options"
                >
                  <DotsThreeVerticalIcon size={16} weight="bold" aria-hidden="true" />
                </Button>
              </div>
            </Dropdown.Trigger>
          )}
        </div>
      </div>
    );
  },
);
