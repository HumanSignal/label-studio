import type { Meta, StoryObj } from "@storybook/react";
import { CollectionUploader } from "./collection-uploader";
import { MediaCard } from "./media-card";
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
          'The Data Collection upload surface. Single-file: the EmptyState dropzone, replaced by one MediaCard when a file exists. Bundle mode (maxFiles > 1): a CollectionHeader (count chip, aggregate progress, grid/list toggle), the members as MediaCards in a 2-column grid or dense rows, and the dropzone lifecycle full → slim strip ("add at least N more" / "up to N more — optional") → gone at capacity. File-specific feedback lives on cards; the over-pick banner and engine errors are collection-level. Fully controlled: the caller owns the upload engine and receives picked files via onPick(files).',
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

const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export const BundleEmpty: StoryObj = {
  name: "Bundle — empty (min 3, max 8)",
  render: () => (
    <CollectionUploader
      rows={[]}
      minFiles={3}
      maxFiles={8}
      fileCount={0}
      storedCount={0}
      onPick={(files) => alert(`picked ${files.length}`)}
      accept="image/png,image/jpeg"
      rules={{ types: ["image/png", "image/jpeg"], min_resolution: 720 }}
      hint="3 to 8 photos per task"
    />
  ),
};

export const BundlePartial: StoryObj = {
  name: "Bundle — partial with add-tile",
  render: () => (
    <CollectionUploader
      rows={[]}
      minFiles={3}
      maxFiles={8}
      fileCount={2}
      storedCount={1}
      bundleProgress={0.4}
      onPick={(files) => alert(`picked ${files.length}`)}
    >
      <MediaCard
        state="uploaded"
        kind="image"
        previewUrl={PIXEL}
        file={{ name: "page_1.png" }}
        storedHint
        onRemove={() => alert("remove")}
      />
      <MediaCard
        state="uploading"
        kind="image"
        previewUrl={PIXEL}
        progress={0.4}
        file={{ name: "page_2.png" }}
        onCancel={() => alert("cancel")}
      />
    </CollectionUploader>
  ),
};

export const BundleComplete: StoryObj = {
  name: "Bundle — complete (add-tile gone)",
  render: () => (
    <CollectionUploader rows={[]} minFiles={2} maxFiles={2} fileCount={2} storedCount={2} onPick={() => undefined}>
      <MediaCard
        state="uploaded"
        kind="image"
        previewUrl={PIXEL}
        file={{ name: "page_1.png" }}
        onRemove={() => undefined}
      />
      <MediaCard
        state="uploaded"
        kind="image"
        previewUrl={PIXEL}
        file={{ name: "page_2.png" }}
        onRemove={() => undefined}
      />
    </CollectionUploader>
  ),
};

export const BundleListView: StoryObj = {
  name: "Bundle — list view",
  render: () => (
    <CollectionUploader rows={[]} minFiles={2} maxFiles={4} fileCount={2} storedCount={2} onPick={() => undefined}>
      <MediaCard
        state="uploaded"
        kind="image"
        previewUrl={PIXEL}
        file={{ name: "angle_1.jpg", size: 2_100_000, contentType: "image/jpeg" }}
        storedHint
        onRemove={() => undefined}
      />
      <MediaCard
        state="uploading"
        kind="image"
        previewUrl={PIXEL}
        progress={0.55}
        file={{ name: "angle_2.jpg", size: 1_800_000, contentType: "image/jpeg" }}
        onCancel={() => undefined}
      />
    </CollectionUploader>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Toggle the header to ☰ to see the members as dense rows (MediaCard layout="row", injected by the uploader). The strip and banners are identical in both views.',
      },
    },
  },
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
