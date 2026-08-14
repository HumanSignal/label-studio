import i18next from "i18next";
import { CaretDownIcon, IconChevronRight, IconTrash } from "@humansignal/icons";
import { Button, Spinner, EnterpriseBadge, Message, Typography } from "@humansignal/ui";
import { inject, observer } from "mobx-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useActions } from "../../../hooks/useActions";
import { cn } from "../../../utils/bem";
import { FF_LOPS_E_3, isFF } from "../../../utils/feature-flags";
import { Dropdown } from "@humansignal/ui";
import Form from "../../Common/Form/Form";
import { Menu } from "../../Common/Menu/Menu";
import { modal, useModalControls } from "../../Common/Modal/Modal";
import "./ActionsButton.prefix.css";

const isFFLOPSE3 = isFF(FF_LOPS_E_3);
const injector = inject(({ store }) => ({
  store,
  hasSelected: store.currentView?.selected?.hasSelected ?? false,
}));

const DialogContent = ({ text, details = [], form, formRef, store, action, validateApi, ctaApi, errorApi }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(form);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState([]);

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

  // Expose a validate() to the dialog footer. It runs the form's own validators
  // (e.g. required fields), hides the form's built-in (unstyled) message block,
  // and surfaces any errors here using the shared <Message> component so the
  // feedback is styled and sits right under the form.
  useEffect(() => {
    if (!validateApi) return;
    validateApi.validate = () => {
      const f = formRef.current;
      if (!f?.validateFields) return true;
      const valid = f.validateFields();
      f.disableValidationMessage?.();
      setErrors(valid ? [] : Array.from(f.validation.values()));
      return valid;
    };
    return () => {
      validateApi.validate = null;
    };
  }, [validateApi, formRef]);

  // Let the footer push server-side errors (e.g. an invalid Expression/Number value returned by
  // the action) into the same styled <Message> block used for client-side validation.
  useEffect(() => {
    if (!errorApi) return;
    errorApi.setErrors = setErrors;
    return () => {
      errorApi.setErrors = null;
    };
  }, [errorApi]);

  const fields = formData?.toJSON ? formData.toJSON() : formData;
  const formFields = useMemo(
    () => (fields ?? []).flatMap((section) => (Array.isArray(section?.fields) ? section.fields : section)),
    [fields],
  );
  const existingColumns = useMemo(
    () =>
      new Set(
        formFields.find((field) => field?.name === "column_name")?.options?.map((option) => option.value ?? option),
      ),
    [formFields],
  );

  const handleFormChange = useCallback(
    (event) => {
      if (event.target?.name !== "column_name") return;
      ctaApi?.setText?.(
        existingColumns.has(event.target.value) ? t("dataManager:updateColumn") : t("dataManager:addColumn"),
      );
    },
    [ctaApi, existingColumns, t],
  );

  return (
    <div className={cn("dialog-content").toClassName()}>
      {text && (
        <Typography variant="body" size="medium" className={cn("dialog-content").elem("text").toClassName()}>
          {text}
        </Typography>
      )}
      {details.length > 0 && (
        <div className="flex flex-col gap-tight mt-base">
          {details.map(({ title, description }) => (
            <Typography key={title} variant="body" size="small">
              <strong>{title}</strong> {description}
            </Typography>
          ))}
        </div>
      )}
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
          <Form.Builder
            ref={formRef}
            fields={fields}
            autosubmit={false}
            withActions={false}
            onChange={handleFormChange}
          />
        </div>
      )}
      {errors.length > 0 && (
        <Message variant="error" look="ghost" size="small" style={{ marginTop: 8 }}>
          {errors.length === 1 ? (
            errors[0].messages[0]
          ) : (
            <ul style={{ margin: 0, paddingInlineStart: 16 }}>
              {errors.map((error) => (
                <li key={error.label}>{error.messages[0]}</li>
              ))}
            </ul>
          )}
        </Message>
      )}
    </div>
  );
};

/**
 * Footer for action dialogs. Unlike `Modal.confirm` (whose OK button always closes),
 * this runs the form's own client-side validation (e.g. required fields) and keeps the
 * dialog open when invalid, surfacing the form's existing validation messages.
 */
const DialogFooter = ({ destructive, okText, validateApi, ctaApi, errorApi, onOk }) => {
  const { t } = useTranslation();
  const controls = useModalControls();
  const [currentOkText, setCurrentOkText] = useState(okText);

  useEffect(() => {
    if (!ctaApi) return;
    ctaApi.setText = setCurrentOkText;
    return () => {
      ctaApi.setText = null;
    };
  }, [ctaApi]);

  const handleOk = async () => {
    if (validateApi?.validate && !validateApi.validate()) return;
    const result = await onOk();
    // A failed action returns structured messages; surface them in the dialog and keep it open
    // so the user can fix their input rather than losing it to a closed modal. Every other
    // outcome closes the dialog (client-side invalid input already returned above).
    if (result?.errorMessages?.length) {
      errorApi?.setErrors?.(result.errorMessages);
      return;
    }
    controls?.hide();
  };

  return (
    <div className="flex gap-2 justify-end">
      <Button
        onClick={() => controls?.hide()}
        look="outlined"
        variant="neutral"
        autoFocus
        aria-label={t("dataManager:cancel")}
        data-testid="dialog-cancel-button"
      >
        {t("dataManager:cancel")}
      </Button>
      <Button
        onClick={handleOk}
        variant={destructive ? "negative" : "primary"}
        aria-label={currentOkText ?? t("dataManager:confirm")}
        data-testid="dialog-ok-button"
      >
        {currentOkText ?? t("dataManager:ok")}
      </Button>
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
          {action.enterprise_badge && <EnterpriseBadge className="ml-tightest" look="ghost" />}
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
        {action.enterprise_badge && <EnterpriseBadge look="ghost" children="" />}
      </span>
    </Menu.Item>
  );
};

const invokeAction = (action, destructive, store, formRef) => {
  if (action.dialog) {
    const { text, form, title, details, ok_text: actionOkText } = action.dialog;

    // Generate dynamic content for destructive actions
    let dialogTitle = title;
    let dialogText = text;
    let okButtonText = actionOkText ?? i18next.t("dataManager:ok");
    // Resolved once and threaded through — never re-parsed out of a (translated) title.
    let objectType = null;

    if (destructive && !title) {
      // Extract the object-type i18n key from the action ID
      const objectMap = {
        delete_tasks: "objectTasks",
        delete_annotations: "objectAnnotations",
        delete_predictions: "objectPredictions",
        delete_reviews: "objectReviews",
        delete_reviewers: "objectReviewAssignments",
        delete_annotators: "objectAnnotatorAssignments",
        delete_ground_truths: "objectGroundTruths",
      };

      // Unknown delete actions fall back to the raw (English) noun derived from the
      // server-provided action title, matching the pre-i18n behaviour.
      objectType = objectMap[action.id]
        ? i18next.t(`dataManager:${objectMap[action.id]}`)
        : action.title.toLowerCase().replace("delete ", "");
      dialogTitle = i18next.t("dataManager:deleteSelectedTitle", { objectType });

      // Title-case the noun for the confirm button. charAt(0).toUpperCase() is a
      // no-op for CJK text, so this stays correct in every locale.
      const titleCaseObject = objectType
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      okButtonText = i18next.t("dataManager:deleteCta", { object: titleCaseObject });
    }

    if (destructive && !form) {
      // Use standardized warning message for simple delete actions
      dialogText = i18next.t("dataManager:deleteWarning", {
        objectType: objectType ?? i18next.t("dataManager:objectItems"),
      });
    }

    const submit = () => {
      const body = formRef.current?.assembleFormData({ asJSON: true });

      store.SDK.invoke("actionDialogOk", action.id, { body });
      return store.invokeAction(action.id, { body });
    };

    // Shared bridge so the footer's OK button can trigger the form's validation
    // (rendered in DialogContent) and keep the dialog open when invalid.
    const validateApi = { validate: null };
    const ctaApi = { setText: null };
    const errorApi = { setErrors: null };

    modal({
      title: dialogTitle
        ? dialogTitle
        : destructive
          ? i18next.t("dataManager:destructiveAction")
          : i18next.t("dataManager:confirmAction"),
      body: (
        <DialogContent
          text={dialogText}
          details={details}
          form={form}
          formRef={formRef}
          store={store}
          action={action}
          validateApi={validateApi}
          ctaApi={ctaApi}
          errorApi={errorApi}
        />
      ),
      footer: (
        <DialogFooter
          destructive={destructive}
          okText={okButtonText}
          validateApi={validateApi}
          ctaApi={ctaApi}
          errorApi={errorApi}
          onOk={submit}
        />
      ),
      allowClose: false,
      closeOnClickOutside: false,
    });
  } else {
    store.invokeAction(action.id);
  }
};

export const ActionsButton = injector(
  observer(({ store, size, hasSelected, ...rest }) => {
    const { t } = useTranslation();
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
    const isRecordMode = isFFLOPSE3 && store.SDK.type === "DE";

    return (
      <Dropdown.Trigger
        content={
          <Menu size="compact">
            {isLoading || isFetching ? (
              <Menu.Item data-testid="loading-actions" disabled>
                {t("dataManager:loadingActions")}
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
          trailing={<CaretDownIcon />}
          aria-label={t("dataManager:tasksActionsAria")}
          data-testid="dm-actions-button"
          {...rest}
        >
          {selectedCount > 0
            ? t(isRecordMode ? "dataManager:selectedRecords" : "dataManager:selectedTasks", { count: selectedCount })
            : t("dataManager:actions")}
        </Button>
      </Dropdown.Trigger>
    );
  }),
);
