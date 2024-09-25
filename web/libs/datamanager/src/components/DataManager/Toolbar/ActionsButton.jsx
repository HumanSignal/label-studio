import { inject, observer } from "mobx-react";
import { useCallback, useRef, useState } from "react";
import { FaAngleDown, FaChevronDown, FaChevronRight, FaChevronUp, FaTrash } from "react-icons/fa";
import { Block, Elem } from "../../../utils/bem";
import { FF_LOPS_E_10, FF_LOPS_E_3, isFF } from "../../../utils/feature-flags";
import { Button } from "../../Common/Button/Button";
import { Dropdown } from "../../Common/Dropdown/DropdownComponent";
import Form from "../../Common/Form/Form";
import { Menu } from "../../Common/Menu/Menu";
import { Modal } from "../../Common/Modal/ModalPopup";
import "./ActionsButton.scss";

const isFFLOPSE3 = isFF(FF_LOPS_E_3);
const isNewUI = isFF(FF_LOPS_E_10);
const injector = inject(({ store }) => ({
  store,
  hasSelected: store.currentView?.selected?.hasSelected ?? false,
}));

const buildDialogContent = (text, form, formRef) => {
  return (
    <Block name="dialog-content">
      <Elem name="text">{text}</Elem>
      {form && (
        <Elem name="form" style={{ paddingTop: 16 }}>
          <Form.Builder ref={formRef} fields={form.toJSON()} autosubmit={false} withActions={false} />
        </Elem>
      )}
    </Block>
  );
};

export const ActionsButton = injector(
  observer(({ store, size, hasSelected, ...rest }) => {
    const formRef = useRef();
    const [isOpen, setIsOpen] = useState(false);
    const selectedCount = store.currentView.selectedCount;
    const actions = store.availableActions.filter((a) => !a.hidden).sort((a, b) => a.order - b.order);

    const invokeAction = (action, destructive) => {
      if (action.dialog) {
        const { type: dialogType, text, form, title } = action.dialog;
        const dialog = Modal[dialogType] ?? Modal.confirm;

        dialog({
          title: title ? title : destructive ? "Destructive action" : "Confirm action",
          body: buildDialogContent(text, form, formRef),
          buttonLook: destructive ? "destructive" : "primary",
          onOk() {
            const body = formRef.current?.assembleFormData({ asJSON: true });

            store.invokeAction(action.id, { body });
          },
        });
      } else {
        store.invokeAction(action.id);
      }
    };

    const ActionButton = (action, parentRef) => {
      const isDeleteAction = action.id.includes("delete");
      const hasChildren = !!action.children?.length;
      const submenuRef = useRef();
      const onClick = useCallback(
        (e) => {
          e.preventDefault();
          if (action.disabled) return;
          action?.callback
            ? action?.callback(store.currentView?.selected?.snapshot, action)
            : invokeAction(action, isDeleteAction);
          parentRef?.current?.close?.();
        },
        [store.currentView?.selected],
      );
      const titleContainer = (
        <Block
          key={action.id}
          tag={Menu.Item}
          size={size}
          onClick={onClick}
          mod={{
            hasSeperator: isDeleteAction,
            hasSubMenu: action.children?.length > 0,
            isSeparator: action.isSeparator,
            isTitle: action.isTitle,
            danger: isDeleteAction,
            disabled: action.disabled,
          }}
          name="actionButton"
        >
          <Elem name="titleContainer" {...(action.disabled ? { title: action.disabledReason } : {})}>
            <Elem name="title">{action.title}</Elem>
            {hasChildren ? <Elem name="icon" tag={FaChevronRight} /> : null}
          </Elem>
        </Block>
      );

      return hasChildren ? (
        <Dropdown.Trigger
          key={action.id}
          align="top-right-outside"
          toggle={false}
          ref={submenuRef}
          content={
            <Block name="actionButton-submenu" tag="ul" mod={{ newUI: isNewUI }}>
              {action.children.map(ActionButton, parentRef)}
            </Block>
          }
        >
          {titleContainer}
        </Dropdown.Trigger>
      ) : isNewUI ? (
        <Dropdown.Trigger
          key={action.id}
          align="top-right-outside"
          toggle={false}
          ref={submenuRef}
          content={
            <Block name="actionButton-submenu" tag="ul" mod={{ newUI: isNewUI }}>
              {(action?.children ?? []).map(ActionButton, parentRef)}
            </Block>
          }
        >
          {titleContainer}
        </Dropdown.Trigger>
      ) : (
        <Menu.Item
          size={size}
          key={action.id}
          danger={isDeleteAction}
          onClick={onClick}
          className={`actionButton${action.isSeparator ? "_isSeparator" : action.isTitle ? "_isTitle" : ""} ${
            action.disabled ? "actionButton_disabled" : ""
          }`}
          icon={isDeleteAction && <FaTrash />}
          title={action.disabled ? action.disabledReason : null}
        >
          {action.title}
        </Menu.Item>
      );
    };

    const actionButtons = actions.map(ActionButton);
    const recordTypeLabel = isFFLOPSE3 && store.SDK.type === "DE" ? "Record" : "Task";

    return (
      <Dropdown.Trigger
        content={
          isNewUI ? (
            <Block tag={Menu} name="actionmenu" size="compact" mod={{ newUI: isNewUI }}>
              {actionButtons}
            </Block>
          ) : (
            <Menu size="compact">{actionButtons}</Menu>
          )
        }
        openUpwardForShortViewport={false}
        disabled={!hasSelected}
        onToggle={(visible) => isFFLOPSE3 && setIsOpen(visible)}
      >
        <Button {...(isNewUI ? { className: "actionButtonPrime" } : {})} size={size} disabled={!hasSelected} {...rest}>
          {selectedCount > 0 ? `${selectedCount} ${recordTypeLabel}${selectedCount > 1 ? "s" : ""}` : "Actions"}
          {isNewUI ? (
            isOpen ? (
              <FaChevronUp size="12" style={{ marginLeft: 4, marginRight: -7 }} />
            ) : (
              <FaChevronDown size="12" style={{ marginLeft: 4, marginRight: -7 }} />
            )
          ) : (
            <FaAngleDown size="16" style={{ marginLeft: 4 }} color="#566fcf" />
          )}
        </Button>
      </Dropdown.Trigger>
    );
  }),
);
