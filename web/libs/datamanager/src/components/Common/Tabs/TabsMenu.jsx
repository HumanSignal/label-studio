import { useMemo } from "react";
import { Menu } from "../Menu/Menu";

const lockedActionTooltip = (action) => `Unlock this tab before ${action}`;

export const TabsMenu = ({
  onClick,
  editable = true,
  closable = true,
  clonable = true,
  lockable = false,
  locked = false,
  virtual = false,
}) => {
  const items = useMemo(
    () => [
      {
        key: "edit",
        title: "Rename",
        visible: editable && !virtual,
        disabled: locked,
        tooltip: locked ? lockedActionTooltip("renaming") : undefined,
        action: () => onClick("edit"),
      },
      {
        key: "duplicate",
        title: "Duplicate",
        visible: !virtual && clonable,
        action: () => onClick("duplicate"),
        willLeave: true,
      },
      {
        key: "lock",
        title: locked ? "Unlock" : "Lock",
        visible: lockable && !virtual,
        action: () => onClick("lock"),
        willLeave: true,
      },
      {
        key: "save",
        title: "Save",
        visible: virtual,
        action: () => onClick("save"),
        willLeave: true,
      },
    ],
    [editable, clonable, lockable, locked, virtual, onClick],
  );

  const showDivider = useMemo(() => closable && items.some(({ visible }) => visible), [closable, items]);

  return (
    <Menu size="medium" onClick={(e) => e.domEvent.stopPropagation()}>
      {items.map((item) =>
        item.visible ? (
          <Menu.Item
            key={item.key}
            onClick={() => !item.disabled && item.action()}
            disabled={item.disabled}
            tooltip={item.tooltip}
            data-leave={item.willLeave}
          >
            {item.title}
          </Menu.Item>
        ) : null,
      )}

      {closable ? (
        <>
          {showDivider && <Menu.Divider />}
          <Menu.Item
            onClick={() => !locked && onClick("close")}
            disabled={locked}
            tooltip={locked ? lockedActionTooltip("closing") : undefined}
            data-leave
          >
            Close
          </Menu.Item>
        </>
      ) : null}
    </Menu>
  );
};
