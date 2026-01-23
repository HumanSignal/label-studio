import { IconChevronDown, IconChevronRight, IconTrash } from "@humansignal/icons";
import { Button, Spinner, EnterpriseBadge } from "@humansignal/ui";
import { inject, observer } from "mobx-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useActions } from "../../../hooks/useActions";
import { cn } from "../../../utils/bem";
import { FF_LOPS_E_3, isFF } from "../../../utils/feature-flags";
import { Dropdown } from "@humansignal/ui";
import Form from "../../Common/Form/Form";
import { Menu } from "../../Common/Menu/Menu";
import { Modal } from "../../Common/Modal/ModalPopup";
import "./ActionsButton.scss";

const isFFLOPSE3 = isFF(FF_LOPS_E_3);
const injector = inject(({ store }) => ({
  store,
  hasSelected: store.currentView?.selected?.hasSelected ?? false,
}));

const DialogContent = ({ text, form, formRef, store, action }) => {
  const [formData, setFormData] = useState(form);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!formData) {
      setIsLoading(true);
      store
        .fetchActionForm(action.id)
        .then((form) => {
          setFormData(form);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [formData, store, action.id]);

  const fields = formData?.toJSON ? formData.toJSON() : formData;

  return (
    <div className={cn("dialog-content").toClassName()}>
      <div className={cn("dialog-content").elem("text").toClassName()}>{text}</div>
      {isLoading && (
        <div
          className={cn("dialog-content").elem("loading").toClassName()}
          style={{ display: "flex", justifyContent: "center", marginTop: 16 }}
        >
          <Spinner />
        </div>
      )}
      {formData && (
        <div className={cn("dialog-content").elem("form").toClassName()} style={{ paddingTop: 16 }}>
          <Form.Builder ref={formRef} fields={fields} autosubmit={false} withActions={false} />
        </div>
      )}
    </div>
  );
};

const ActionButton = ({ action, parentRef, store, formRef }) => {
  const isDeleteAction = action.id.includes("delete");
  const hasChildren = !!action.children?.length;
  const submenuRef = useRef();

  const onClick = useCallback(
    (e) => {
      e.preventDefault();
      if (action.disabled) return;
      action?.callback
        ? action?.callback(store.currentView?.selected?.snapshot, action)
        : invokeAction(action, isDeleteAction, store, formRef);
      parentRef?.current?.close?.();
    },
    [store.currentView?.selected, action, isDeleteAction, parentRef, store, formRef],
  );

  const titleContainer = (
    <Menu.Item
      key={action.id}
      className={cn("actionButton")
        .mod({
          hasSeperator: isDeleteAction,
          hasSubMenu: action.children?.length > 0,
          isSeparator: action.isSeparator,
          isTitle: action.isTitle,
          danger: isDeleteAction,
          disabled: action.disabled,
        })
        .toClassName()}
      size="small"
      onClick={onClick}
      aria-label={action.title}
    >
      <div
        className={cn("actionButton").elem("titleContainer").toClassName()}
        {...(action.disabled ? { title: action.disabledReason } : {})}
      >
        <div className={cn("actionButton").elem("title").toClassName()}>
          {action.title}
          {action.enterprise_badge && <EnterpriseBadge className="ml-1" ghost />}
        </div>
        {hasChildren ? <IconChevronRight className={cn("actionButton").elem("icon").toClassName()} /> : null}
      </div>
    </Menu.Item>
  );

  if (hasChildren) {
    return (
      <Dropdown.Trigger
        key={action.id}
        align="top-right-outside"
        toggle={false}
        ref={submenuRef}
        content={
          <ul className={cn("actionButton-submenu").toClassName()}>
            {action.children.map((childAction) => (
              <ActionButton
                key={childAction.id}
                action={childAction}
                parentRef={parentRef}
                store={store}
                formRef={formRef}
              />
            ))}
          </ul>
        }
      >
        {titleContainer}
      </Dropdown.Trigger>
    );
  }

  return (
    <Menu.Item
      size="small"
      key={action.id}
      variant={isDeleteAction ? "negative" : undefined}
      onClick={onClick}
      className={`actionButton${action.isSeparator ? "_isSeparator" : action.isTitle ? "_isTitle" : ""} ${
        action.disabled ? "actionButton_disabled" : ""
      }`}
      icon={isDeleteAction && <IconTrash />}
      title={action.disabled ? action.disabledReason : null}
      aria-label={action.title}
      disabled={action.disabled}
      tooltip={action.disabled_reason}
      tooltipAlignment="bottom-center"
    >
      <span className="flex items-center justify-between gap-base w-full">
        {action.title}
        {action.enterprise_badge && <EnterpriseBadge ghost />}
      </span>
    </Menu.Item>
  );
};

const invokeAction = (action, destructive, store, formRef) => {
  if (action.dialog) {
    const { type: dialogType, text, form, title } = action.dialog;
    const dialog = Modal[dialogType] ?? Modal.confirm;

    // Generate dynamic content for destructive actions
    let dialogTitle = title;
    let dialogText = text;
    let okButtonText = "OK";

    if (destructive && !title) {
      // Extract object type from action ID and title
      const objectMap = {
        delete_tasks: "tasks",
        delete_annotations: "annotations",
        delete_predictions: "predictions",
        delete_reviews: "reviews",
        delete_reviewers: "review assignments",
        delete_annotators: "annotator assignments",
        delete_ground_truths: "ground truths",
      };

      const objectType = objectMap[action.id] || action.title.toLowerCase().replace("delete ", "");
      dialogTitle = `Delete selected ${objectType}?`;

      // Convert to title case for button text
      const titleCaseObject = objectType
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      okButtonText = `Delete ${titleCaseObject}`;
    }

    if (destructive && !form) {
      // Use standardized warning message for simple delete actions
      const objectType = dialogTitle ? dialogTitle.replace("Delete selected ", "").replace("?", "") : "items";
      dialogText = `You are about to delete the selected ${objectType}.\n\nThis can't be undone.`;
    }

    dialog({
      title: dialogTitle ? dialogTitle : destructive ? "Destructive action" : "Confirm action",
      body: <DialogContent text={dialogText} form={form} formRef={formRef} store={store} action={action} />,
      buttonLook: destructive ? "negative" : "primary",
      okText: destructive ? okButtonText : undefined,
      onOk() {
        const body = formRef.current?.assembleFormData({ asJSON: true });

        store.SDK.invoke("actionDialogOk", action.id, { body });
        store.invokeAction(action.id, { body });
      },
      closeOnClickOutside: false,
    });
  } else {
    store.invokeAction(action.id);
  }
};

export const ActionsButton = injector(
  observer(({ store, size, hasSelected, ...rest }) => {
    const formRef = useRef();
    const selectedCount = store.currentView.selectedCount;
    const [isOpen, setIsOpen] = useState(false);

    // Use TanStack Query hook for fetching actions
    const {
      actions: serverActions,
      isLoading,
      isFetching,
    } = useActions({
      enabled: isOpen,
      projectId: store.SDK.projectId,
    });

    const actions = useMemo(() => {
      return [...store.availableActions, ...serverActions].filter((a) => !a.hidden).sort((a, b) => a.order - b.order);
    }, [store.availableActions, serverActions]);
    const actionButtons = actions.map((action) => (
      <ActionButton key={action.id} action={action} parentRef={formRef} store={store} formRef={formRef} />
    ));
    const recordTypeLabel = isFFLOPSE3 && store.SDK.type === "DE" ? "Record" : "Task";

    return (
      <Dropdown.Trigger
        content={
          <Menu size="compact">
            {isLoading || isFetching ? (
              <Menu.Item data-testid="loading-actions" disabled>
                Loading actions...
              </Menu.Item>
            ) : (
              actionButtons
            )}
          </Menu>
        }
        openUpwardForShortViewport={false}
        disabled={!hasSelected}
        onToggle={setIsOpen}
      >
        <Button
          size={size}
          variant="neutral"
          look="outlined"
          disabled={!hasSelected}
          trailing={<IconChevronDown />}
          aria-label="Tasks Actions"
          {...rest}
        >
          {selectedCount > 0 ? `${selectedCount} ${recordTypeLabel}${selectedCount > 1 ? "s" : ""}` : "Actions"}
        </Button>
      </Dropdown.Trigger>
    );
  }),
);
