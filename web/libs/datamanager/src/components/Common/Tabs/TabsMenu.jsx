import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Menu } from "../Menu/Menu";

export const TabsMenu = ({
  onClick,
  editable = true,
  closable = true,
  clonable = true,
  lockable = false,
  locked = false,
  virtual = false,
}) => {
  const { t } = useTranslation();

  const items = useMemo(
    () => [
      {
        key: "edit",
        title: t("dataManager:renameTab"),
        visible: editable && !virtual,
        disabled: locked,
        tooltip: locked ? t("dataManager:unlockBeforeRenaming") : undefined,
        action: () => onClick("edit"),
      },
      {
        key: "duplicate",
        title: t("dataManager:duplicateTab"),
        visible: !virtual && clonable,
        action: () => onClick("duplicate"),
        willLeave: true,
      },
      {
        key: "lock",
        title: locked ? t("dataManager:unlockTab") : t("dataManager:lockTab"),
        visible: lockable && !virtual,
        action: () => onClick("lock"),
        willLeave: true,
      },
      {
        key: "save",
        title: t("dataManager:saveTab"),
        visible: virtual,
        action: () => onClick("save"),
        willLeave: true,
      },
    ],
    [editable, clonable, lockable, locked, virtual, onClick, t],
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
            tooltip={locked ? t("dataManager:unlockBeforeClosing") : undefined}
            data-leave
          >
            {t("dataManager:closeTab")}
          </Menu.Item>
        </>
      ) : null}
    </Menu>
  );
};
