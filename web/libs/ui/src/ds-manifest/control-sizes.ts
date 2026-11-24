/**
 * Height of a control. Leave it off on pages and dialogs (`medium`, 40px).
 * - `small` (32px): inside a toolbar, filter row, table header or side panel.
 * - `smaller` (24px): inside a table cell, list row, chip or another control.
 *
 * Every control in the same row uses the same size.
 */
export type ControlSize = "medium" | "small" | "smaller";

export type ControlSizing = {
  default: ControlSize;
  rule: string;
  sizes: Record<ControlSize, { px: number; use_when: string }>;
  never_when: string[];
  /** What a manifest entry with `sizing: "fixed"` means. */
  fixed: string;
  /** Where icons and text sit inside a control, per size. Every sized control applies it itself. */
  icons: {
    rule: string;
    sizes: Record<ControlSize, { icon: number; edge: string; gap: string; text_inset: string }>;
  };
};

/** The one size scale of the controls, and what each size is for. Every sized control takes it as `size`. */
export const CONTROL_SIZES: ControlSizing = {
  default: "medium",
  rule: "Leave size off. Pass it only inside a bar or panel (small) or a repeated row or cell (smaller), and then on every control in that row.",
  sizes: {
    medium: {
      px: 40,
      use_when: "A page or dialog the user fills in: settings pages, create and edit dialogs, page-level actions.",
    },
    small: {
      px: 32,
      use_when:
        "A bar or panel around the work: toolbars, filter rows, table headers, side panels, editor top and bottom bars.",
    },
    smaller: {
      px: 24,
      use_when: "Inside a repeated item: table cells, list and region rows, chips, controls nested in another control.",
    },
  },
  never_when: [
    "Different sizes on controls in the same row",
    "A size chosen to fit the space available: change the layout, not the size",
    "A height set on the control with CSS, a class or a CSS variable",
  ],
  fixed: "One size only. It centres in a row of any control size, so it takes no size prop.",
  icons: {
    rule: "The control places its own icons: the icon size, its padding from the edge and its gap to the text come from the control size. Pass an icon without a size; never pad or resize it at the call site. An icon you pass to a Button is bold at small and smaller (18px or less), as every Phosphor icon.",
    sizes: {
      medium: { icon: 20, edge: "spacing-tight", gap: "spacing-tight", text_inset: "spacing-base" },
      small: { icon: 16, edge: "spacing-tight", gap: "spacing-tight", text_inset: "spacing-tight" },
      smaller: { icon: 12, edge: "spacing-tight", gap: "spacing-tighter", text_inset: "spacing-tight" },
    },
  },
};

export const CONTROL_SIZE_NAMES = Object.keys(CONTROL_SIZES.sizes) as ControlSize[];

/** The stroke of a control's own icon: bold at 18px or smaller, regular above, as for every Phosphor icon. */
export const controlIconWeight = (size: ControlSize = "medium"): "bold" | "regular" =>
  (CONTROL_SIZES.icons.sizes[size] ?? CONTROL_SIZES.icons.sizes.medium).icon <= 18 ? "bold" : "regular";
