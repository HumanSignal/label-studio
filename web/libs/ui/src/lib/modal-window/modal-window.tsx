"use client";

import { IconClose } from "@humansignal/icons";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { CSSProperties, ReactNode } from "react";
import { cnm } from "../../utils/utils";
import { Button } from "../button/button";
import { Typography } from "../typography/typography";
import styles from "./modal-window.module.css";

export type ModalWindowSize = "small" | "medium" | "large" | "larger" | "fullscreen";

/**
 * - `workflow` — Top-aligned panel: when body content height changes, the panel stays anchored so the layout does not jump vertically. Use for multi-step flows, long forms, and substantial content.
 * - `dialog` — Vertically centered: suited to short, stable-height confirmations, acknowledgements, and simple actions.
 */
export type ModalWindowVariant = "workflow" | "dialog";

export interface ModalWindowProps {
  /**
   * Whether the modal is open.
   */
  open?: boolean;
  /**
   * Called when the open state changes.
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Layout intent: top-anchored workflow surface vs vertically centered dialog. Ignored when `size` is `fullscreen`.
   * @default 'workflow'
   */
  variant?: ModalWindowVariant;
  /**
   * Primary width preset (`max-w-*`). Below the viewport width, the panel is full width (caps only apply on wider viewports).
   * Prefer this over custom width overrides.
   * @default 'medium'
   */
  size?: ModalWindowSize;
  /**
   * Optional title shown in the default header layout.
   * If you use `header` instead, pass `title` for a screen-reader label when the custom header has no visible title.
   */
  title?: ReactNode;
  /**
   * Optional description below the title (default header layout only).
   */
  description?: ReactNode;
  /**
   * Custom header content. When set, replaces the default title + description layout (use `title` for an sr-only label if needed).
   */
  header?: ReactNode;
  /**
   * Main body content.
   */
  children: ReactNode;
  /**
   * Optional footer (e.g. actions).
   */
  footer?: ReactNode;
  /**
   * Show dimmed scrim behind the panel.
   * @default true
   */
  showScrim?: boolean;
  /**
   * Close when clicking the scrim / outside the panel.
   * @default true
   */
  closeOnScrimClick?: boolean;
  /**
   * Show the header close button.
   * @default true
   */
  showCloseButton?: boolean;
  /**
   * When true, omit the header row (title, description, close). A screen-reader-only dialog title is still rendered from `title` for assistive technology—set `title` to a meaningful string.
   * @default false
   */
  hideHeader?: boolean;
  /**
   * @remarks Prefer `size` for width. Use only when a design-approved width cannot be expressed with presets (migration / edge cases). Prefer token-backed utilities from the design system.
   */
  contentClassName?: string;
  /**
   * @remarks Prefer `size` for width. Inline dimensions bypass the standard scale—use sparingly.
   */
  contentStyle?: CSSProperties;
  className?: string;
  headerClassName?: string;
  /**
   * Classes for the scrollable body region. Merged with default layout and `px-wide pb-wide` padding; pass `p-0` (or other spacing) to override the default body padding.
   */
  bodyClassName?: string;
  footerClassName?: string;
  /**
   * @default 'modal-window'
   */
  dataTestId?: string;
  /**
   * Open/close motion (soft zoom + fade). Set to `false` for instant show/hide. Respects `prefers-reduced-motion`.
   * @default true
   */
  animate?: boolean;
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
}

/** Max widths on the standard Tailwind max-width scale (roomier than sm/lg/xl for app chrome). */
const sizeToMaxWidthClass: Record<Exclude<ModalWindowSize, "fullscreen">, string> = {
  small: "max-w-lg",
  medium: "max-w-2xl",
  large: "max-w-4xl",
  larger: "max-w-6xl",
};

/**
 * ModalWindow — Radix Dialog–based overlay with optional header, scrollable body, and footer.
 *
 * Use `variant="workflow"` (default) for task-focused panels where body height may change—top alignment keeps the panel from shifting vertically. Use `variant="dialog"` or the {@link Dialog} wrapper for short, centered confirmations and notices.
 *
 * **Migration from legacy `modal()` / `Modal`:**
 * - Gate with `ff.isActive(...)` next to each modal, not via a global switch in app `Modal.tsx`.
 * - Content that used `useModalControls()` from the legacy modal must lift state into the parent or use a compat layer — `ModalWindow` does not provide that React context.
 */
export function ModalWindow({
  open,
  onOpenChange,
  variant = "workflow",
  size = "medium",
  title,
  description,
  header,
  children,
  footer,
  showScrim = true,
  closeOnScrimClick = true,
  showCloseButton = true,
  hideHeader = false,
  contentClassName,
  contentStyle,
  className,
  headerClassName,
  bodyClassName,
  footerClassName,
  dataTestId = "modal-window",
  animate = true,
  onOpenAutoFocus,
  onCloseAutoFocus,
}: ModalWindowProps) {
  const isFullscreen = size === "fullscreen";
  const isDialogVariant = !isFullscreen && variant === "dialog";

  const panelClassName = cnm(
    "flex min-h-0 flex-col bg-neutral-background overflow-hidden outline-none",
    isDialogVariant ? "origin-center" : "origin-top",
    styles.panel,
    isFullscreen
      ? [
          "fixed z-[2001] inset-0 m-0 max-h-none h-screen w-full rounded-none",
          animate && styles.withAnimationFullscreen,
        ]
      : isDialogVariant
        ? [
            "fixed z-[2001] left-1/2 top-1/2 w-full max-h-[calc(100dvh-2*var(--spacing-widest))] rounded-lg",
            !animate && "-translate-x-1/2 -translate-y-1/2",
            animate && styles.withAnimationDialog,
          ]
        : [
            "fixed z-[2001] left-1/2 top-widest w-full max-h-[calc(100dvh-2*var(--spacing-widest))] rounded-lg",
            !animate && "-translate-x-1/2",
            animate && styles.withAnimation,
          ],
    className,
    !isFullscreen && sizeToMaxWidthClass[size as Exclude<ModalWindowSize, "fullscreen">],
    contentClassName,
  );

  const showHeaderChrome = !hideHeader && Boolean(header || title || description || showCloseButton);

  /** Radix runs `onPointerDownOutside` before dismiss; blocking scrim close requires preventDefault there (see Radix Dialog docs), not only `onInteractOutside`. */
  const blockDismissFromOutside = !closeOnScrimClick;

  /* modal={false}: portaled overlays (e.g. UI Dropdown) stay interactive; Radix renders no Dialog.Overlay then — use a custom scrim. */
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogPrimitive.Portal>
        {showScrim ? (
          <div
            role="presentation"
            aria-hidden
            data-slot="modal-window-scrim"
            data-testid="modal-window-scrim"
            data-state="open"
            className={cnm(
              "pointer-events-auto fixed inset-0 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              styles.scrim,
            )}
          />
        ) : null}
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={panelClassName}
          style={contentStyle}
          data-slot="modal-window-content"
          data-variant={isFullscreen ? undefined : variant}
          data-testid={dataTestId}
          tabIndex={-1}
          onPointerDownOutside={blockDismissFromOutside ? (e) => e.preventDefault() : undefined}
          onInteractOutside={blockDismissFromOutside ? (e) => e.preventDefault() : undefined}
          onOpenAutoFocus={onOpenAutoFocus}
          onCloseAutoFocus={onCloseAutoFocus}
        >
          {showHeaderChrome ? (
            <div
              className={cnm("flex shrink-0 items-center justify-between gap-wide p-wide", headerClassName)}
              data-slot="modal-window-header"
              data-testid="modal-window-header"
            >
              <div className="min-w-0 flex-1">
                {header ? (
                  <>
                    <DialogPrimitive.Title className="sr-only">{title ?? "Modal window"}</DialogPrimitive.Title>
                    <div data-slot="modal-window-header-custom">{header}</div>
                  </>
                ) : (
                  <>
                    {typeof title === "string" ? (
                      <DialogPrimitive.Title asChild>
                        <Typography
                          variant="title"
                          size={isDialogVariant ? "medium" : "large"}
                          className={cnm("text-neutral-content", !title && "sr-only")}
                          data-slot="modal-window-title"
                          data-testid="modal-window-title"
                        >
                          {title || "Modal window"}
                        </Typography>
                      </DialogPrimitive.Title>
                    ) : (
                      <DialogPrimitive.Title
                        className={cnm("text-neutral-content", !title && "sr-only")}
                        data-slot="modal-window-title"
                        data-testid="modal-window-title"
                      >
                        {title ?? "Modal window"}
                      </DialogPrimitive.Title>
                    )}
                    {description ? (
                      typeof description === "string" ? (
                        <DialogPrimitive.Description asChild>
                          <Typography
                            variant="body"
                            size="small"
                            className="mt-tight text-neutral-content-subtle"
                            data-slot="modal-window-description"
                            data-testid="modal-window-description"
                          >
                            {description}
                          </Typography>
                        </DialogPrimitive.Description>
                      ) : (
                        <DialogPrimitive.Description
                          className="mt-tight text-sm text-neutral-content-subtle"
                          data-slot="modal-window-description"
                          data-testid="modal-window-description"
                        >
                          {description}
                        </DialogPrimitive.Description>
                      )
                    ) : null}
                  </>
                )}
              </div>
              {showCloseButton ? (
                <DialogPrimitive.Close asChild>
                  <Button
                    look="string"
                    size="small"
                    className="shrink-0"
                    leading={<IconClose />}
                    aria-label="Close"
                    data-testid="modal-window-close-button"
                  />
                </DialogPrimitive.Close>
              ) : null}
            </div>
          ) : (
            <DialogPrimitive.Title className="sr-only">{title ?? "Modal window"}</DialogPrimitive.Title>
          )}

          <div
            className={cnm("min-h-0 flex-1 overflow-y-auto px-wide pb-wide", bodyClassName)}
            data-slot="modal-window-body"
            data-testid="modal-window-body"
          >
            {children}
          </div>

          {footer ? (
            <div
              className={cnm(
                "shrink-0 border-t bg-neutral-surface border-neutral-border px-wide py-base",
                footerClassName,
              )}
              data-slot="modal-window-footer"
              data-testid="modal-window-footer"
            >
              {footer}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Centered {@link ModalWindow} (`variant="dialog"`). Prefer for short confirmations and notices with stable height.
 *
 * For the Radix/shad compound primitive also named `Dialog`, import from `@humansignal/shad/components/ui/dialog`.
 */
export function Dialog(props: ModalWindowProps) {
  return <ModalWindow variant="dialog" {...props} />;
}
