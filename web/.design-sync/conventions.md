## How to build with HumanSignal UI (Label Studio's design system)

**Setup.** Link `styles.css` once — it brings the tokens (`tokens/tokens.css`), fonts (Figtree for UI text, IBM Plex
Mono for code), Tailwind base/utilities, and every component's CSS. Components are on `window.HumanSignalUI`. No root
provider is needed; the page background and text color come from `body` (`bg-neutral-background
text-neutral-content`). Theme is light by default — for dark, set `data-color-scheme="dark"` on `<html>`; every
semantic token flips. Toasts are the one provider case: wrap the app in `<ToastProvider>` with a `<ToastViewport />`
inside it, then call `useToast()`. Icons are components on the same global: custom `Icon*` (e.g. `IconSearch`,
`IconSettings`) and Phosphor `*Icon` (e.g. `MagnifyingGlassIcon`, `GearIcon`, `XIcon`).

**Styling idiom — semantic Tailwind utilities generated from the design tokens.** Never use raw palette names
(`bg-grape-700`) or default Tailwind colors (`bg-blue-500`, `text-gray-600`): only semantic names follow dark mode.

| Family | Utilities |
|---|---|
| Page / panels | `bg-neutral-background` (page), `bg-neutral-surface` (cards, panels), `bg-neutral-surface-hover`, `bg-neutral-surface-active`, `bg-neutral-surface-inset` (wells) |
| Text | `text-neutral-content`, `text-neutral-content-subtle`, `-subtler`, `-subtlest`; links/brand `text-primary-content` |
| Borders | `border-neutral-border`, `border-neutral-border-subtle`, `border-neutral-border-bold` |
| Brand fill | `bg-primary-surface` + `text-primary-surface-content`; tinted: `bg-primary-background`, `bg-primary-emphasis`, `border-primary-border` |
| Status | `{negative,positive,warning}-{surface,background,emphasis,content,icon,border}` with `bg-`/`text-`/`border-` |
| Accents | `accent-{grape,blueberry,kale,kiwi,mango,canteloupe,persimmon,plum,fig,sand}-{dark,bold,base,subtle,subtler,subtlest}` |
| Spacing | `p-`/`px-`/`py-`/`m-`/`gap-` + `tightest` (2px) `tighter` (4px) `tight` (8px) `base` (16px) `wide` (24px) `wider` (32px) `widest` (40px) |
| Type | `text-body-{smaller,small,medium}`, `text-label-{smaller,small,medium}`, `text-title-{small,medium,large}`, `text-headline-{small,medium,large}`, `text-display-{small,medium,large}`; `font-regular` `font-medium` `font-semibold` `font-bold` |
| Radius | `rounded-smallest` (2px) `rounded-smaller` (4px) `rounded-small` (8px) `rounded-medium` (12px) `rounded-large` (16px) |

Outside class names, use the same tokens as CSS variables: `var(--color-neutral-surface)`, `var(--spacing-base)`,
`var(--corner-radius-small)`, `var(--font-size-body-medium)`. For text, prefer `<Typography variant size>` over
hand-styled tags; for actions, `<Button variant look size>` (`variant`: primary · neutral · negative · positive ·
warning · gradient · inverted; `look`: filled · outlined · string; `size`: medium · small · smaller).

**Where the truth lives.** `tokens/tokens.css` lists every semantic token (light on `:root`, dark under
`[data-color-scheme="dark"]`). Each component's props are in `components/<group>/<Name>/<Name>.d.ts`, with usage in
`<Name>.prompt.md` — read them before composing; e.g. `ModalWindow` is controlled via `open` + `onOpenChange`, and
`Dropdown`, `Popover`, `Tooltip`, `ContextMenu`, `Drawer` open from a trigger child.

**Example.**

```jsx
const { Typography, Button, Badge, IconSearch } = window.HumanSignalUI;

function ProjectCard() {
  return (
    <div className="bg-neutral-surface border border-neutral-border rounded-small p-base flex flex-col gap-tight">
      <div className="flex items-center gap-tight">
        <Typography variant="title" size="medium">Invoice extraction</Typography>
        <Badge variant="positive">Active</Badge>
      </div>
      <Typography variant="body" size="small" className="text-neutral-content-subtle">
        1,240 tasks · 86% labeled
      </Typography>
      <div className="flex gap-tight">
        <Button look="filled">Label all tasks</Button>
        <Button look="outlined" variant="neutral" leading={<IconSearch />}>Explore</Button>
      </div>
    </div>
  );
}
```
