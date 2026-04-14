import {
  IconChevronLeft,
  IconChevronRight,
  IconFolderOpen,
  IconPersonInCircle,
  IconSettings,
} from "@humansignal/icons";
import type { Meta, StoryObj } from "@storybook/react";
import type { ComponentProps } from "react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../shad/components/ui/tabs";
import { Button } from "../button/button";
import { EmptyState } from "../empty-state/empty-state";
import { Message } from "../message/message";
import { Stepper } from "../stepper/stepper";
import { Typography } from "../typography/typography";
import { ModalWindow } from "./modal-window";

const meta: Meta<typeof ModalWindow> = {
  component: ModalWindow,
  title: "UI/ModalWindow",
  args: {
    variant: "workflow",
    size: "medium",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["workflow", "dialog"],
      description:
        "workflow: top-anchored (stable when content height changes). dialog: vertically centered for short prompts.",
    },
    size: {
      control: "select",
      options: ["small", "medium", "large", "larger", "fullscreen"],
    },
    showScrim: { control: "boolean" },
    showCloseButton: { control: "boolean" },
    animate: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof ModalWindow>;

function ModalStoryShell(props: ComponentProps<typeof ModalWindow>) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button onClick={() => setOpen(true)} data-testid="modal-open-trigger">
        Open modal
      </Button>
      <ModalWindow {...props} open={open} onOpenChange={setOpen} />
    </div>
  );
}

/**
 * Default medium width with title, description, and footer actions.
 * Use **Controls → size** to verify max-width presets on a wide canvas.
 *
 * **When to use:** Focused work tied to the user’s current task—settings, edits, or choices they expect before returning to the page (not promotional or unrelated interruptions).
 */
export const Default: Story = {
  args: {
    title: "Project settings",
    description: "Update how this project appears to your team.",
  },
  render: (args) => (
    <ModalStoryShell
      {...args}
      footer={
        <div className="flex w-full justify-end gap-tight">
          <Button variant="neutral" look="outlined" onClick={() => undefined}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => undefined}>
            Save
          </Button>
        </div>
      }
    >
      <>
        <Message variant="primary" title="Tip">
          Changes apply after you save. You can revisit these settings anytime.
        </Message>
        <Typography variant="body" size="small" className="mt-base text-neutral-content-subtle">
          Use the footer actions to dismiss or confirm your edits.
        </Typography>
      </>
    </ModalStoryShell>
  ),
};

/**
 * Small preset — narrow column for confirmations or compact forms.
 *
 * **When to use:** Short, high-stakes prompts: destructive or irreversible actions, important warnings, or one or two fields the flow cannot continue without.
 */
export const Small: Story = {
  args: {
    size: "small",
    title: "Rename item",
    description: "Choose a new display name.",
  },
  render: (args) => (
    <ModalStoryShell {...args}>
      <Typography variant="body" size="small">
        Short content fits the narrow width without extra horizontal whitespace.
      </Typography>
    </ModalStoryShell>
  ),
};

/**
 * **Dialog use** — `variant="dialog"` vertically centers the panel for short, blocking prompts (confirmations,
 * acknowledgements). Uses the dialog title scale; combine with `size="small"` or `medium` and footer actions.
 */
export const DialogUse: Story = {
  name: "Dialog use",
  args: {
    variant: "dialog",
    size: "small",
    title: "Delete project?",
  },
  render: (args) => (
    <ModalStoryShell
      {...args}
      footer={
        <div className="flex w-full justify-end gap-tight">
          <Button variant="neutral" look="outlined" onClick={() => undefined}>
            Cancel
          </Button>
          <Button variant="negative" onClick={() => undefined}>
            Delete
          </Button>
        </div>
      }
    >
      <>
        <Typography variant="body" size="small" className="text-neutral-content-subtle">
          All tasks and annotations in this project will be permanently removed.
        </Typography>
        <Typography variant="body" size="small" className="mt-tight text-neutral-content-subtle">
          This action cannot be undone.
        </Typography>
      </>
    </ModalStoryShell>
  ),
};

/**
 * Medium preset (default) — general-purpose width.
 *
 * **When to use:** Typical forms and decisions for a user-initiated step—collecting what’s needed to proceed without hiding so much context that the user must guess.
 */
export const Medium: Story = {
  args: {
    size: "medium",
    title: "Invite collaborators",
    description: "Share access with your organization.",
  },
  render: (args) => (
    <ModalStoryShell {...args}>
      <Tabs defaultValue="members">
        <TabsList className="mb-base">
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>
        <TabsContent value="members">
          <Typography variant="body" size="small">
            Search and add people from your workspace. They will receive an email invitation.
          </Typography>
        </TabsContent>
        <TabsContent value="groups">
          <Typography variant="body" size="small">
            Assign a group to grant access in bulk.
          </Typography>
        </TabsContent>
      </Tabs>
    </ModalStoryShell>
  ),
};

/**
 * Large preset — dense tables or wide layouts.
 *
 * **When to use:** Still a single focused task, but needs room for tables or wider layouts—only if the user can answer from what’s **inside** the dialog (not information blocked behind it).
 */
export const Large: Story = {
  args: {
    size: "large",
    title: "Data overview",
    description: "Review imported items before continuing.",
  },
  render: (args) => (
    <ModalStoryShell {...args}>
      <div className="rounded border border-neutral-border">
        {["Row A", "Row B", "Row C"].map((label) => (
          <div
            key={label}
            className="flex items-center justify-between border-b border-neutral-border p-tight last:border-b-0"
          >
            <Typography variant="body" size="small" className="font-medium">
              {label}
            </Typography>
            <Typography variant="body" size="small" className="text-neutral-content-subtle">
              Ready
            </Typography>
          </div>
        ))}
      </div>
    </ModalStoryShell>
  ),
};

/**
 * Larger preset — extra-wide layouts (e.g. split panes, wide tables).
 *
 * **When to use:** Same guardrails as large—extra room for dense or split content. Skip it if users must compare or copy from the page behind the overlay to decide.
 */
export const Larger: Story = {
  args: {
    size: "larger",
    title: "Wide layout",
    description: "Maximum preset width before fullscreen.",
  },
  render: (args) => (
    <ModalStoryShell {...args}>
      <div className="grid grid-cols-1 gap-wide md:grid-cols-2">
        <div className="rounded border border-neutral-border p-base">
          <Typography variant="label" size="small" className="mb-tight block text-neutral-content-subtle">
            Primary column
          </Typography>
          <Typography variant="body" size="small">
            Main choices or preview live here. The larger preset gives both columns room side by side on wide viewports.
          </Typography>
        </div>
        <div className="rounded border border-neutral-border p-base">
          <Typography variant="label" size="small" className="mb-tight block text-neutral-content-subtle">
            Secondary column
          </Typography>
          <Typography variant="body" size="small">
            Supporting list, metadata, or a narrow form stack—typical split-pane pattern for dense layouts.
          </Typography>
        </div>
      </div>
    </ModalStoryShell>
  ),
};

/**
 * Fullscreen — covers the viewport for immersive flows (e.g. editors).
 *
 * **When to use:** Demanding sub-flows where a dedicated surface reduces distraction—editors, guided setup, or data-heavy review. If the task is long or cognitively heavy, a full page may be kinder than staying “trapped” in steps.
 */
export const Fullscreen: Story = {
  args: {
    size: "fullscreen",
    title: "Fullscreen workspace",
  },
  render: (args) => (
    <ModalStoryShell
      {...args}
      footer={
        <div className="flex w-full justify-end gap-tight">
          <Button variant="neutral" look="outlined">
            Back
          </Button>
          <Button variant="primary">Continue</Button>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <EmptyState
          size="medium"
          variant="neutral"
          icon={<IconFolderOpen />}
          title="No items yet"
          description="Add content to see it in this fullscreen layout."
        />
      </div>
    </ModalStoryShell>
  ),
};

/**
 * No dimmed overlay — use sparingly; focus trap still applies.
 *
 * **When to use:** Rare—only when keeping the background visible materially helps the task **and** the interruption is still justified. Default scrim makes the blocking mode obvious; without it, users may not realize the main UI is inactive.
 */
export const WithoutScrim: Story = {
  args: {
    showScrim: false,
    title: "No scrim",
    description: "Background stays fully visible.",
  },
  render: (args) => (
    <ModalStoryShell {...args}>
      <Typography variant="body" size="small">
        Prefer the default scrim for most flows so users perceive a clear modal context.
      </Typography>
    </ModalStoryShell>
  ),
};

/**
 * No visible header chrome — a screen-reader-only title is still provided.
 *
 * **When to use:** Custom surface layouts where the default title row gets in the way—always pair with another clear way to dismiss and keep an accessible name (`title`) for assistive tech.
 */
export const WithoutHeader: Story = {
  args: {
    title: "Hidden title for assistive tech",
    showCloseButton: false,
  },
  render: (args) => (
    <ModalStoryShell {...args}>
      <Typography variant="body" size="small">
        No header bar or close button in the header; use inline actions or parent state to dismiss if needed.
      </Typography>
    </ModalStoryShell>
  ),
};

/**
 * Long body scrolls inside the panel; top alignment stays stable.
 *
 * **When to use:** A single dialog still fits the task, but content exceeds one screen—prefer this over cramming unrelated tasks. If users need external references or deep comparison, move the work to the main page or a non-blocking pattern.
 */
export const LongScrollableBody: Story = {
  args: {
    title: "Scrollable content",
    description: "Many rows — scroll inside the modal body.",
  },
  render: (args) => (
    <ModalStoryShell {...args}>
      {Array.from({ length: 40 }, (_, i) => (
        <div key={i} className="mb-tight border-b border-neutral-border pb-tight">
          <Typography variant="body" size="small">
            Section {i + 1}
          </Typography>
          <Typography variant="body" size="small" className="text-neutral-content-subtle">
            Supporting text for section {i + 1}.
          </Typography>
        </div>
      ))}
    </ModalStoryShell>
  ),
};

const WIZARD_STEPS = [
  { id: "basics", label: "Basics" },
  { id: "details", label: "Details" },
  { id: "review", label: "Review" },
] as const;

function WizardTopAlignedDemo() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const lastIndex = WIZARD_STEPS.length - 1;

  const title = "New project";
  const descriptions = [
    "Project name and summary.",
    "Tall content below—the top edge stays put.",
    "Review and create.",
  ] as const;

  return (
    <div>
      <Button
        onClick={() => {
          setStep(0);
          setOpen(true);
        }}
        data-testid="wizard-open-trigger"
      >
        Open wizard
      </Button>
      <ModalWindow
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setStep(0);
        }}
        size="medium"
        bodyClassName="p-0"
        title={title}
        description={descriptions[step]}
        footer={
          <div className="flex w-full items-center justify-between gap-tight">
            <Button
              type="button"
              variant="neutral"
              look="outlined"
              disabled={step === 0}
              leading={<IconChevronLeft />}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              data-testid="wizard-previous"
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="primary"
              trailing={step === lastIndex ? undefined : <IconChevronRight />}
              onClick={() => {
                if (step >= lastIndex) {
                  setOpen(false);
                  setStep(0);
                } else {
                  setStep((s) => s + 1);
                }
              }}
              data-testid="wizard-next"
            >
              {step >= lastIndex ? "Finish" : "Next"}
            </Button>
          </div>
        }
      >
        <div className="border-b border-neutral-border px-wide pb-tight pt-wide">
          <Stepper
            variant="horizontal"
            aria-label="Wizard progress"
            steps={WIZARD_STEPS.map((s, i) => ({
              id: s.id,
              label: s.label,
              canNavigate: i <= step,
              completed: i < step,
            }))}
            currentStepIndex={step}
            onStepSelect={setStep}
            data-testid="modal-wizard-stepper"
          />
        </div>
        <div className="p-wide">
          {step === 0 ? (
            <Typography variant="body" size="small">
              Compact body so this step stays short.
            </Typography>
          ) : null}
          {step === 1 ? (
            <div className="flex flex-col gap-base">
              <Message variant="neutral" title="Tall step">
                Centered modals shift vertically when content height changes; this panel does not.
              </Message>
              <ul className="list-inside list-disc space-y-tight text-body-small text-neutral-content-subtle">
                {Array.from({ length: 14 }, (_, i) => (
                  <li key={i}>Optional detail line {i + 1} — placeholder copy to vary vertical space.</li>
                ))}
              </ul>
            </div>
          ) : null}
          {step === 2 ? (
            <Typography variant="body" size="small">
              Use <strong>Finish</strong> to close or <strong>Previous</strong> to go back.
            </Typography>
          ) : null}
        </div>
      </ModalWindow>
    </div>
  );
}

/**
 * Multi-step flow using the shared `Stepper` and footer navigation. Step 2 is intentionally tall: because
 * `ModalWindow` is **top-aligned** (`top-wide`), the sheet does not re-center when body height changes—unlike
 * vertically centered dialogs, which appear to “jump” as steps grow or shrink.
 *
 * **When to use:** Legitimate way to chunk an overwhelming setup: show progress, keep each step short, and don’t spring it on users mid–high-stakes flow (e.g. checkout) unless unavoidable.
 */
export const WizardTopAligned: Story = {
  render: () => <WizardTopAlignedDemo />,
};

/**
 * Custom header composition with icons and actions.
 *
 * **When to use:** Identity-rich or utility-heavy headers (avatars, badges, inline settings) while the body stays a standard modal—only when the extra chrome clarifies the task, not for novelty.
 */
export const CustomHeaderContent: Story = {
  args: {
    title: "Modal window",
  },
  render: (args) => (
    <ModalStoryShell
      {...args}
      header={
        <div className="flex items-center gap-base pr-10">
          <IconPersonInCircle className="text-neutral-content-subtle" />
          <div>
            <Typography variant="label" size="medium" className="block">
              Custom header
            </Typography>
            <Typography variant="body" size="small" className="text-neutral-content-subtle">
              Built from UI primitives instead of the default title row.
            </Typography>
          </div>
          <Button look="string" size="small" className="ml-auto" leading={<IconSettings />} aria-label="Settings" />
        </div>
      }
    >
      <Typography variant="body" size="small">
        The default title block is replaced by `header`; the `title` prop still supplies an accessible name.
      </Typography>
    </ModalStoryShell>
  ),
};

/**
 * No enter/exit motion — panel appears and disappears instantly (still focus-trapped when open).
 *
 * **When to use:** Reduced motion preference, distracting environments, or automated tests—behavior and semantics stay modal; only transition is suppressed.
 */
export const WithoutAnimation: Story = {
  args: {
    animate: false,
    title: "No animation",
    description: "Use when motion is distracting or for tests.",
  },
  render: (args) => (
    <ModalStoryShell {...args}>
      <Typography variant="body" size="small">
        The `animate` prop defaults to true (soft zoom + fade). Set `animate=
        {false}` to disable.
      </Typography>
    </ModalStoryShell>
  ),
};

/**
 * Escape hatch: `contentClassName` / `contentStyle` can override width.
 * **Prefer the `size` prop** for standard widths — use overrides only for reviewed edge cases.
 *
 * **When to use:** Migration or one-off layouts only—presets communicate expected commitment level; custom width is not a substitute for choosing the right modal size or page-level flow.
 */
export const CustomWidthEscapeHatch: Story = {
  args: {
    size: "large",
    title: "Narrow override",
    description: "This story uses contentClassName to force a smaller max width than `small`.",
    contentClassName: "max-w-sm",
    contentStyle: { maxWidth: "20rem" },
  },
  render: (args) => (
    <ModalStoryShell {...args}>
      <Message variant="warning" title="Discouraged pattern">
        Prefer `size` presets. Combining `contentClassName` with `size` is for migration or exceptional layouts only.
      </Message>
    </ModalStoryShell>
  ),
};
