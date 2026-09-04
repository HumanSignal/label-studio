import type { Meta, StoryObj } from "@storybook/react";
import { CollectionUploader } from "./collection-uploader";
import { SubmissionRuleBadges, SubmissionStatusChip, evaluateSubmissionRules } from "./submission-rules";

const RULES = {
  types: ["video/mp4", "video/quicktime"],
  min_bytes: 102400,
  max_bytes: 31457280,
  min_duration: 2,
  max_duration: 6,
  orientation: "portrait" as const,
};

const meta: Meta<typeof CollectionUploader> = {
  component: CollectionUploader,
  title: "UI/CollectionUploader",
  parameters: {
    docs: {
      description: {
        component:
          "The Data Collection dropzone — an EmptyState-composed upload surface showing the declared validation rules as neutral badges before any pick. Fully controlled: the caller owns the upload engine and receives picked files via onPick(files). Pairs with MediaCard: dropzone when no file exists, card when one does, never both (one file per task).",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof CollectionUploader>;

export const Empty: Story = {
  args: {
    rows: [],
    onPick: (files) => alert(`picked: ${files.map((f) => f.name).join(", ")}`),
    accept: RULES.types.join(","),
    rules: RULES,
    hint: "One portrait clip per task · 2–6 seconds · up to 30 MB",
  },
};

export const DragHighlighted: Story = {
  name: "Drag over the surface",
  args: { ...Empty.args, dragActive: true },
};

export const Disabled: Story = {
  args: { ...Empty.args, disabled: true },
};

export const RuleBadgeStates: StoryObj = {
  name: "Rule badges (pass / fail / unknown)",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SubmissionRuleBadges results={evaluateSubmissionRules(null, RULES)} />
      <SubmissionRuleBadges
        results={evaluateSubmissionRules(
          { contentType: "video/quicktime", size: 16_497_221, durationSec: 4.2, width: 1080, height: 1920 },
          RULES,
        )}
      />
      <SubmissionRuleBadges
        results={evaluateSubmissionRules(
          { contentType: "image/png", size: 12, durationSec: 17.5, width: 1920, height: 1080 },
          RULES,
        )}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Neutral before any pick (top), all passing (middle), all failing (bottom). A fact the browser cannot know — e.g. size 0 from an iOS camera capture — renders neutral, never red.",
      },
    },
  },
};

export const StatusChips: StoryObj = {
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <SubmissionStatusChip tone="primary">Uploading 62%</SubmissionStatusChip>
      <SubmissionStatusChip tone="positive">Ready to submit</SubmissionStatusChip>
      <SubmissionStatusChip tone="neutral">Submitted</SubmissionStatusChip>
      <SubmissionStatusChip tone="negative">Not accepted</SubmissionStatusChip>
    </div>
  ),
};
