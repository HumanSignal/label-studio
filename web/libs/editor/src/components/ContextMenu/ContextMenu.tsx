import React, { useState } from "react";
import clsx from "clsx";
import { Dropdown, useDropdown } from "@humansignal/ui";
import { IconEllipsisVertical } from "@humansignal/icons";
import styles from "./ContextMenu.module.scss";

export interface ContextMenuContext {
  dropdown: ReturnType<typeof useDropdown>;
}
export type MenuActionOnClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, ctx: ContextMenuContext) => void;
export interface ContextMenuAction {
  label: React.ReactNode;
  onClick: MenuActionOnClick;
  icon?: React.ReactNode;
  iconClassName?: string;
  key?: string;
  separator?: boolean;
  danger?: boolean;
  enabled?: boolean;
}
export interface ContextMenuProps {
  actions: ContextMenuAction[];
  className?: string;
}
export interface ContextMenuTriggerProps {
  className?: string;
  children: React.ReactNode;
  content?: React.ReactNode;
  onToggle?: (isOpen: boolean) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ actions, className }) => {
  const dropdown = useDropdown();

  return (
    <div className={clsx(styles.contextMenu, className)}>
      {actions.map(
        (action, index) =>
          action.enabled !== false && (
            <React.Fragment key={action.key ?? index}>
              {action.separator && <div className={styles.seperator} />}
              <div
                className={clsx(styles.option, action.danger && styles.danger)}
                onClick={(e) => action.onClick(e, { dropdown })}
              >
                {action.icon && <span className={clsx(styles.icon, action.iconClassName)}>{action.icon}</span>}
                {action.label}
              </div>
            </React.Fragment>
          ),
      )}
    </div>
  );
};

export const ContextMenuTrigger: React.FC<ContextMenuTriggerProps> = ({ children, content, onToggle, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={clsx(styles.trigger, isOpen && styles.open, className)} onClick={(e) => e.stopPropagation()}>
      <Dropdown.Trigger
        content={content || undefined}
        onToggle={(isOpen) => {
          setIsOpen(isOpen);
          onToggle?.(isOpen);
        }}
      >
        {children ? children : <IconEllipsisVertical width={28} height={28} />}
      </Dropdown.Trigger>
    </div>
  );
};
