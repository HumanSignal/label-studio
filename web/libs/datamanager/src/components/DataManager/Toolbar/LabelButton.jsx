import { inject } from "mobx-react";
import { Button } from "../../Common/Button/Button";
import { Interface } from "../../Common/Interface";
import { useCallback, useEffect, useRef, useState } from "react";

const Arrow = ({ rotate }) => (
  <svg
    fill="currentColor"
    strokeWidth="0"
    viewBox="0 0 320 512"
    height="16"
    width="16"
    xmlns="http://www.w3.org/2000/svg"
    style={{ transform: rotate ? "rotate(180deg)" : undefined }}
  >
    <title>Arrow Icon</title>
    <path d="M143 352.3L7 216.3c-9.4-9.4-9.4-24.6 0-33.9l22.6-22.6c9.4-9.4 24.6-9.4 33.9 0l96.4 96.4 96.4-96.4c9.4-9.4 24.6-9.4 33.9 0l22.6 22.6c9.4 9.4 9.4 24.6 0 33.9l-136 136c-9.2 9.4-24.4 9.4-33.8 0z" />
  </svg>
);

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
  // const all = selectedCount === 0 || allSelected;
  const disabled = target === "annotations";
  const triggerRef = useRef();
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = useCallback(() => setIsOpen((isOpen) => !isOpen), []);

  const handleClickOutside = useCallback((e) => {
    const el = triggerRef.current;

    if (el && !el.contains(e.target)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("click", handleClickOutside, { capture: true });

    return () => {
      document.removeEventListener("click", handleClickOutside, { capture: true });
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
    width: 20,
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
    width: 180,
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
        <div style={{ display: "flex" }}>
          <Button
            size={size}
            disabled={disabled}
            mod={{ size: size ?? "medium", look: "primary", disabled }}
            style={primaryStyle}
            onClick={onLabelAll}
          >
            Label {selectedCount ? selectedCount : "All"} Task{!selectedCount || selectedCount > 1 ? "s" : ""}
          </Button>
          <Button
            ref={triggerRef}
            size={size}
            mod={{ size: size ?? "medium", look: "primary", disabled }}
            style={triggerStyle}
            onClick={toggleOpen}
            aria-label={"Toggle open"}
          >
            <Arrow rotate={isOpen} />
          </Button>
        </div>
        <Button size={size} style={secondStyle} mod={{ size: size ?? "medium", disabled }} onClick={onLabelVisible}>
          Label Tasks As Displayed
        </Button>
      </div>
    </Interface>
  ) : null;
});
