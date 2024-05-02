import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { FaEllipsisV } from "react-icons/fa";
import { BemWithSpecifiContext } from "../../../utils/bem";
import { Button } from "../Button/Button";
import { Dropdown } from "../Dropdown/DropdownComponent";
import { Icon } from "../Icon/Icon";
import Input from "../Input/Input";
import "./Tabs.styl";
import { TabsMenu } from "./TabsMenu";

const { Block, Elem } = BemWithSpecifiContext();

const TabsContext = createContext();

export const Tabs = ({ children, activeTab, onChange, onAdd, tabBarExtraContent, allowedActions, addIcon }) => {
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
      <Block name="tabs">
        <Elem name="list">
          {children}

          {allowedActions.add !== false && <Elem tag={Button} name="add" type="text" onClick={onAdd} icon={addIcon} />}
        </Elem>
        <Elem name="extra">{tabBarExtraContent}</Elem>
      </Block>
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
    <Elem
      name="item"
      mod={{ active, hover, virtual }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Elem
        name="item-left"
        onClick={() => switchTab?.(tab)}
        mod={{
          edit: renameMode,
        }}
        title={currentTitle}
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
      </Elem>
      <Elem name="item-right">
        {showMenu && (
          <Dropdown.Trigger
            align="bottom-left"
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
            <Elem name="item-right-button">
              <Button
                type="link"
                size="small"
                style={{ padding: "6px", margin: "auto", color: "#999" }}
                icon={<Icon icon={FaEllipsisV} />}
              />
            </Elem>
          </Dropdown.Trigger>
        )}
      </Elem>
    </Elem>
  );
};
