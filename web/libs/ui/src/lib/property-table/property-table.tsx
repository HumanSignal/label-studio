import { useState, forwardRef, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../accordion/accordion";
import { Typography } from "../typography/typography";
import { Card } from "../card/card";
import { Badge } from "../badge/badge";
import { Button, type ButtonProps } from "../button/button";
import styles from "./property-table.module.css";

/** Compact, non-sortable properties in an inspector. Editing and validation remain controlled by the caller. */
export function PropertyTable({
  columns,
  children,
  hideHeader = false,
  labelWidth,
  className,
  ...props
}: HTMLAttributes<HTMLTableElement> & {
  columns: string[];
  hideHeader?: boolean;
  labelWidth?: number;
}) {
  return (
    <div className={styles.container}>
      <table {...props} className={[styles.table, className].filter(Boolean).join(" ")}>
        <colgroup>
          <col style={{ width: labelWidth ?? (columns.length > 2 ? 28 : 96) }} />
          {columns.slice(1).map((column) => (
            <col key={column} />
          ))}
        </colgroup>
        <thead className={hideHeader ? styles.srOnly : undefined}>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        {children}
      </table>
    </div>
  );
}

export function PropertyTableRow({
  label,
  values,
  details,
  active,
  onSelect,
  selectLabel,
  disabled,
  ...props
}: Omit<HTMLAttributes<HTMLTableSectionElement>, "children"> & {
  label: ReactNode;
  values: ReactNode[];
  details?: ReactNode;
  active?: boolean;
  onSelect?: () => void;
  selectLabel?: string;
  disabled?: boolean;
}) {
  return (
    <tbody {...props} data-active={active || undefined}>
      <tr>
        <th scope="row">
          {onSelect ? (
            <Button
              type="button"
              variant="neutral"
              look="ghost"
              size="smaller"
              className={styles.selector}
              aria-label={selectLabel}
              aria-pressed={!!active}
              disabled={disabled}
              onClick={onSelect}
            >
              {label}
            </Button>
          ) : (
            label
          )}
        </th>
        {values.map((value, index) => (
          <td key={index}>{value}</td>
        ))}
      </tr>
      {details && (
        <tr>
          <td colSpan={values.length + 1}>
            <div className={styles.details}>{details}</div>
          </td>
        </tr>
      )}
    </tbody>
  );
}

export function PropertyList({
  items,
  ...props
}: Omit<HTMLAttributes<HTMLTableElement>, "children"> & {
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <PropertyTable {...props} columns={["Property", "Value"]} hideHeader>
      {items.map(({ label, value }) => (
        <PropertyTableRow key={label} label={label} values={[value]} />
      ))}
    </PropertyTable>
  );
}

export interface PropertyTableInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "prefix"> {
  "data-testid"?: string;
  type?: "number" | "text";
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export const PropertyTableInput = forwardRef<HTMLInputElement, PropertyTableInputProps>(
  ({ className, prefix, suffix, type = "number", ...props }, ref) => (
    <div
      className={styles.inputFrame}
      data-disabled={props.disabled || undefined}
      data-invalid={props["aria-invalid"] || undefined}
    >
      {prefix && (
        <Typography as="span" size="smaller" className={styles.affix} aria-hidden="true">
          {prefix}
        </Typography>
      )}
      <input {...props} ref={ref} type={type} className={[styles.input, className].filter(Boolean).join(" ")} />
      {suffix && (
        <Typography as="span" size="smaller" className={styles.affix} aria-hidden="true">
          {suffix}
        </Typography>
      )}
    </div>
  ),
);
PropertyTableInput.displayName = "PropertyTableInput";

/** Compact text property with the same Enter/Escape and blur behavior as coordinate fields. */
export function PropertyTextInput({
  value,
  onCommit,
  ...props
}: Omit<PropertyTableInputProps, "value" | "defaultValue" | "type" | "onChange"> & {
  value: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState<{ source: string; value: string } | null>(null);
  if (draft && draft.source !== value) setDraft(null);
  const current = draft?.source === value ? draft.value : value;
  const commit = () => {
    if (!props.disabled && !props.readOnly && current !== value) onCommit(current);
    setDraft(null);
  };
  return (
    <PropertyTableInput
      {...props}
      type="text"
      value={current}
      onChange={(event) => setDraft({ source: value, value: event.currentTarget.value })}
      onBlur={(event) => {
        commit();
        props.onBlur?.(event);
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        } else if (event.key === "Escape") {
          event.preventDefault();
          setDraft(null);
        }
        props.onKeyDown?.(event);
      }}
    />
  );
}

/** Shared inspector section. Keep fields mounted so collapsing never discards a draft. */
export function PropertySection({
  title,
  meta,
  children,
  defaultOpen = true,
  className,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen ? ["content"] : []);
  return (
    <Accordion
      type="multiple"
      role="group"
      aria-label={title}
      value={open}
      onValueChange={setOpen}
      className={[styles.section, className].filter(Boolean).join(" ")}
    >
      <AccordionItem value="content" className={styles.sectionItem}>
        <div className={styles.sectionHeader}>
          <AccordionTrigger className={styles.sectionTrigger}>{title}</AccordionTrigger>
          {meta && (
            <Typography as="span" size="smaller" className={styles.sectionMeta}>
              {meta}
            </Typography>
          )}
        </div>
        <AccordionContent forceMount hidden={!open.includes("content")} className={styles.sectionContent}>
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

/** A named row of related fields, e.g. Position X/Y or Size W/H. */
export function PropertyFieldRow({
  label,
  children,
  columns = 2,
}: {
  label: string;
  children: ReactNode;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div className={styles.fieldRow}>
      <Typography as="span" size="smaller" className={styles.fieldLabel}>
        {label}
      </Typography>
      <div className={styles.fieldValues} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {children}
      </div>
    </div>
  );
}

/** The compact action treatment shared by Image and all other property inspectors. */
export const PropertyButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "neutral", look = "outlined", size = "smaller", type = "button", ...props }, ref) => (
    <Button
      {...props}
      ref={ref}
      type={type}
      variant={variant}
      look={look}
      size={size}
      className={[styles.actionButton, className].filter(Boolean).join(" ")}
    />
  ),
);
PropertyButton.displayName = "PropertyButton";

export function PropertyActions({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className={styles.actionRow} role="group" aria-label={label}>
      {children}
    </div>
  );
}

export function PropertyFooter({
  children,
  editable = false,
  instructionsId,
}: {
  children?: ReactNode;
  editable?: boolean;
  instructionsId?: string;
}) {
  return (
    <footer className={styles.footer}>
      {children && (
        <PropertySection title="Source details" defaultOpen={false}>
          {children}
        </PropertySection>
      )}
      {editable && (
        <Typography id={instructionsId} size="smaller" className={styles.keyboardHint}>
          <kbd>Enter</kbd> apply · <kbd>Esc</kbd> cancel
        </Typography>
      )}
    </footer>
  );
}

export function PropertyPreview({
  title,
  label,
  children,
  onCancel,
  onApply,
  applyDisabled,
  cancelDisabled,
  actions,
  applyContent = "Apply",
  cancelContent = "Cancel",
  cancelLabel = "Cancel edit",
  applyLabel = "Apply edit",
}: {
  title: string;
  label: string;
  children: ReactNode;
  onCancel?: () => void;
  onApply?: () => void;
  applyDisabled?: boolean;
  cancelDisabled?: boolean;
  actions?: ReactNode;
  applyContent?: ReactNode;
  cancelContent?: ReactNode;
  cancelLabel?: string;
  applyLabel?: string;
}) {
  return (
    <Card size="compact" className={styles.preview} role="region" aria-label={label}>
      <div className={styles.sectionHeader}>
        <Typography as="h4" variant="label" size="small">
          {title}
        </Typography>
        {onApply && (
          <Badge variant="neutral" size="small" shape="square">
            Not applied
          </Badge>
        )}
      </div>
      <div className={styles.previewContent}>{children}</div>
      <div className={styles.previewActions}>
        {actions}
        {onCancel && (
          <PropertyButton variant="neutral" aria-label={cancelLabel} onClick={onCancel} disabled={cancelDisabled}>
            {cancelContent}
          </PropertyButton>
        )}
        {onApply && (
          <PropertyButton
            variant="primary"
            look="filled"
            aria-label={applyLabel}
            disabled={applyDisabled}
            onClick={onApply}
          >
            {applyContent}
          </PropertyButton>
        )}
      </div>
    </Card>
  );
}
