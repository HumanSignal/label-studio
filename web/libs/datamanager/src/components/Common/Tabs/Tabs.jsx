import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import { IconEllipsisVertical, IconPlus } from "@humansignal/icons";
import { cn } from "../../../utils/bem";
import { Button } from "@humansignal/ui";
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
        <span className={tabsCN.elem("list").toString()}>
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
            <Button size="small" look="string" variant="neutral" onClick={onAdd} data-leave>
              <IconPlus className="!h-3 !w-3" />
            </Button>
          )}
        </span>
        <span className={tabsCN.elem("extra").toString()}>{tabBarExtraContent}</span>
      </div>
    </TabsContext.Provider>
  );
};

export const TabsItem = ({
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
  const [renameMode, setRenameMode] = useState(false);
  const [hover, setHover] = useState(false);

  const active = tab === selectedTab;

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
    return managable && (tabIsEditable || tabIsDeletable || tabIsCloneable);
  }, [managable, tabIsEditable, tabIsDeletable, tabIsCloneable]);

  const saveTabTitle = useCallback(
    (ev) => {
      const { type, key } = ev;

      if (type === "blur" || ["Enter", "Escape"].includes(key)) {
        ev.preventDefault();
        setRenameMode(false);

        if (key === "Escape") {
          setCurrentTitle(title);
          onCancelEditing?.();
        }

        onFinishEditing(currentTitle);
      }
    },
    [currentTitle],
  );

  return (
    <div
      className={tabsCN.elem("item").mod({ active, hover, virtual }).toString()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className={tabsCN
          .elem("item-left")
          .mod({
            edit: renameMode,
          })
          .toString()}
        onClick={() => switchTab?.(tab)}
        title={currentTitle}
        data-leave
      >
        {renameMode ? (
          <Input
            size="small"
            autoFocus={true}
            style={{ width: 100 }}
            value={currentTitle}
            onKeyDownCapture={saveTabTitle}
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
              <Button look="string" size="small" variant="neutral">
                <IconEllipsisVertical className="w-4 h-4" />
              </Button>
            </div>
          </Dropdown.Trigger>
        )}
      </div>
    </div>
  );
};
