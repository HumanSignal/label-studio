import { inject } from "mobx-react";
import { Button, ButtonGroup } from "@humansignal/ui";
import { Interface } from "../../Common/Interface";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconChevronDown } from "@humansignal/icons";
import { Dropdown } from "@humansignal/ui";
import { Menu } from "../../Common/Menu/Menu";

const injector = inject(({ store }) => {
  const { dataStore, currentView } = store;
  const totalTasks = store.project?.task_count ?? store.project?.task_number ?? 0;
  const foundTasks = dataStore?.total ?? 0;

  return {
    store,
    canLabel: totalTasks > 0 || foundTasks > 0,
    target: currentView?.target ?? "tasks",
    selectedCount: currentView?.selectedCount,
    allSelected: currentView?.allSelected,
  };
});

export const LabelButton = injector(({ store, canLabel, size, target, selectedCount }) => {
  const disabled = target === "annotations";
  const triggerRef = useRef();
  const [isOpen, setIsOpen] = useState(false);

  const handleClickOutside = useCallback((e) => {
    const el = triggerRef.current;

    if (el && !el.contains(e.target)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("click", handleClickOutside, { capture: true });

    return () => {
      document.removeEventListener("click", handleClickOutside, {
        capture: true,
      });
    };
  }, []);

  const onLabelAll = () => {
    localStorage.setItem("dm:labelstream:mode", "all");
    store.startLabelStream();
  };

  const onLabelVisible = () => {
    localStorage.setItem("dm:labelstream:mode", "filtered");
    store.startLabelStream();
  };

  const triggerStyle = {
    width: 24,
    padding: 0,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: isOpen ? 0 : undefined,
    boxShadow: "none",
  };

  const primaryStyle = {
    width: 160,
    padding: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: isOpen ? 0 : undefined,
  };

  const secondStyle = {
    width: triggerStyle.width + primaryStyle.width,
    padding: 0,
    display: isOpen ? "flex" : "none",
    position: "absolute",
    zIndex: 10,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  };

  selectedCount;

  return canLabel ? (
    <Interface name="labelButton">
      <div>
        <ButtonGroup>
          <Button
            size={size ?? "small"}
            variant="primary"
            look="outlined"
            disabled={disabled}
            style={primaryStyle}
            onClick={onLabelAll}
          >
            Label {selectedCount ? selectedCount : "All"} Task
            {!selectedCount || selectedCount > 1 ? "s" : ""}
          </Button>
          <Dropdown.Trigger
            align="bottom-right"
            content={
              <Menu size="compact">
                <Menu.Item onClick={onLabelVisible}>Label Tasks As Displayed</Menu.Item>
              </Menu>
            }
          >
            <Button size={size} look="outlined" variant="primary" aria-label={"Toggle open"}>
              <IconChevronDown />
            </Button>
          </Dropdown.Trigger>
        </ButtonGroup>
      </div>
    </Interface>
  ) : null;
});
