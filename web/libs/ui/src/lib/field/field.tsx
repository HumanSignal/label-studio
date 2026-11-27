import { InfoIcon, WarningCircleIcon } from "@humansignal/icons";
import clsx from "clsx";
import { cloneElement, isValidElement, type ReactElement, type ReactNode, useId } from "react";
import { Badge } from "../badge/badge";
import { Tooltip } from "../Tooltip/Tooltip";
import styles from "./field.module.css";

export type FieldLayout = "stacked" | "horizontal";

/** The label, help and error props every form control accepts; the control renders them through Field. */
export interface FieldChromeProps {
  /** Visible label. Without a label, description, hint or error the control renders bare. */
  label?: ReactNode;
  /** Help under the label, before the control. */
  description?: ReactNode;
  /** Extra help in a tooltip beside the label. */
  info?: ReactNode;
  /** Shows the Required badge. Fields are optional by default and carry no marker. */
  required?: boolean;
  /** Help under the control. The error replaces it while there is one. */
  hint?: ReactNode;
  /** Error message. Sets the control's invalid state. */
  error?: ReactNode;
  /** `stacked`: control under the label. `horizontal`: control at the right of the label and description. */
  layout?: FieldLayout;
}

export interface FieldProps extends FieldChromeProps {
  /** Content at the right of the label, such as a link. */
  action?: ReactNode;
  /** Id for the control; generated when omitted. */
  id?: string;
  /**
   * Set by controls that wire their own native element (`fieldIds`): Field then leaves its child as is.
   * Leave it off when wrapping a control yourself.
   */
  wired?: boolean;
  /** Renders a fieldset with a legend, for a group of controls (radio or checkbox groups). */
  group?: boolean;
  className?: string;
  /** One control. Field passes it `id`, `aria-describedby` and `invalid`. */
  children: ReactNode;
}

export const hasFieldChrome = (props: FieldChromeProps) =>
  Boolean(props.label || props.description || props.hint || props.error || props.info);

/**
 * The label, description, hint and error around one control, wired for assistive technology.
 * Controls render it themselves when they get a label or an error; use it directly for a control
 * with no single native element (a code editor, a tree select, a row of inputs).
 */
export const Field = ({
  label,
  description,
  info,
  required,
  hint,
  error,
  layout = "stacked",
  action,
  id,
  group = false,
  wired = false,
  className,
  children,
}: FieldProps) => {
  const generated = useId();
  const childId = isValidElement(children) ? (children.props as { id?: string }).id : undefined;
  const controlId = id ?? childId ?? `field-${generated}`;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const messageId = error || hint ? `${controlId}-message` : undefined;
  const describedBy = [descriptionId, messageId].filter(Boolean).join(" ") || undefined;
  const invalid = Boolean(error);

  const control =
    !group && !wired && isValidElement(children)
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          id: controlId,
          "aria-describedby": describedBy,
          ...(invalid ? { invalid: true } : {}),
        })
      : children;

  const labelContent = label && (
    <>
      {label}
      {info && (
        <Tooltip title={info}>
          <span className={styles.info} role="img" aria-label="More information">
            <InfoIcon size={14} />
          </span>
        </Tooltip>
      )}
      {required && (
        <Badge size="small" variant="neutral">
          Required
        </Badge>
      )}
    </>
  );

  const head = (label || action) && (
    <div className={styles.head}>
      {label && !group && (
        <label className={styles.label} htmlFor={controlId}>
          {labelContent}
        </label>
      )}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );

  const message = error ? (
    <div id={messageId} className={styles.error} role={group ? "alert" : undefined}>
      <WarningCircleIcon size={14} aria-hidden="true" />
      <span>{error}</span>
    </div>
  ) : (
    hint && (
      <div id={messageId} className={styles.hint}>
        {hint}
      </div>
    )
  );

  const Root = group ? "fieldset" : "div";

  return (
    <Root
      className={clsx(styles.field, className)}
      data-layout={layout}
      aria-describedby={group ? describedBy : undefined}
      aria-invalid={group && invalid ? true : undefined}
    >
      {group && label && <legend className={clsx(styles.label, styles.legend)}>{labelContent}</legend>}
      <div className={styles.text}>
        {head}
        {description && (
          <div id={descriptionId} className={styles.description}>
            {description}
          </div>
        )}
      </div>
      <div className={styles.control}>{control}</div>
      {message}
    </Root>
  );
};

/** The ids Field gives a control and its texts, so a control can wire its own native element. */
export function fieldIds(chrome: FieldChromeProps, id: string) {
  const describedBy = [chrome.description && `${id}-description`, (chrome.error || chrome.hint) && `${id}-message`]
    .filter(Boolean)
    .join(" ");
  return { id, "aria-describedby": describedBy || undefined };
}

/** Wraps a control that wired itself with `fieldIds` in Field, when it was given a label, help or an error. */
export function withField(chrome: FieldChromeProps & { id: string; className?: string }, control: ReactElement) {
  if (!hasFieldChrome(chrome)) return control;
  return (
    <Field {...chrome} wired className={chrome.className}>
      {control}
    </Field>
  );
}
