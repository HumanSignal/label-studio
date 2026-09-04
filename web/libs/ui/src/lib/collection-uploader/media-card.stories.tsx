import type { Meta, StoryObj } from "@storybook/react";
import { MediaCard } from "./media-card";
import { evaluateSubmissionRules } from "./submission-rules";

const RULES = {
  types: ["video/mp4", "video/quicktime"],
  min_bytes: 102400,
  max_bytes: 31457280,
  min_duration: 2,
  max_duration: 6,
};

const FILE = { name: "IMG_9180.mov", size: 16_497_221, contentType: "video/quicktime" };
const GOOD_META = { contentType: "video/quicktime", size: 16_497_221, durationSec: 4.2, width: 1080, height: 1920 };
const BAD_META = { contentType: "video/quicktime", size: 16_497_221, durationSec: 17.48, width: 480, height: 360 };

// 1x1 black png so the media area renders without external assets
const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const meta: Meta<typeof MediaCard> = {
  component: MediaCard,
  title: "UI/MediaCard",
  parameters: {
    docs: {
      description: {
        component:
          "The single, stable media card for Data Collection submissions (image and video). Fixed anatomy, divider-separated: header (ext badge · filename · status chip) | media with poster/play + progress | rule badges + metadata + message (DS Message) | actions footer, right-aligned. One card per task — attempts and replacements mutate it in place; never a list. Pairs with CollectionUploader (the dropzone): dropzone when no file, card when one exists, never both.",
      },
    },
  },
  argTypes: {
    state: {
      control: "select",
      options: ["uploading", "failed", "rejected", "ready", "stored", "submitted", "readonly"],
    },
    kind: { control: "select", options: ["video", "image", "file"] },
  },
};
export default meta;

type Story = StoryObj<typeof MediaCard>;

const handlers = {
  onCancel: () => alert("cancel"),
  onRetry: () => alert("retry"),
  onReplace: () => alert("replace"),
  onRemove: () => alert("remove"),
  onRetryPreview: () => alert("retry preview"),
};

export const Uploading: Story = {
  args: {
    state: "uploading",
    file: FILE,
    kind: "video",
    previewUrl: PIXEL,
    progress: 0.62,
    ruleResults: evaluateSubmissionRules({ ...GOOD_META, durationSec: undefined }, RULES),
    ...handlers,
  },
};

export const UploadFailed: Story = {
  args: {
    state: "failed",
    file: { ...FILE, size: 24_044_525 },
    kind: "video",
    previewUrl: PIXEL,
    message: "Upload failed — check your connection and retry.",
    ruleResults: evaluateSubmissionRules(GOOD_META, RULES),
    meta: GOOD_META,
    ...handlers,
  },
};

export const NotAccepted: Story = {
  name: "Not accepted (rejected pick)",
  args: {
    state: "rejected",
    file: { name: "landscape_clip.mp4", size: 1_400_000, contentType: "video/mp4" },
    kind: "video",
    previewUrl: PIXEL,
    message: "This file doesn't meet the requirements — replace it with another file.",
    ruleResults: evaluateSubmissionRules(BAD_META, RULES),
    meta: BAD_META,
    ...handlers,
  },
};

export const ReadyToSubmit: Story = {
  args: {
    state: "ready",
    file: FILE,
    kind: "video",
    previewUrl: PIXEL,
    ruleResults: evaluateSubmissionRules(GOOD_META, RULES),
    meta: GOOD_META,
    ...handlers,
  },
};

export const Stored: Story = {
  name: "Stored (recovered on return)",
  args: {
    state: "stored",
    file: FILE,
    kind: "video",
    previewUrl: PIXEL,
    storedHint: true,
    ruleResults: evaluateSubmissionRules({ contentType: FILE.contentType, size: FILE.size }, RULES),
    ...handlers,
  },
};

export const Submitted: Story = {
  name: "Submitted (contributor: Replace only)",
  args: {
    state: "submitted",
    file: FILE,
    kind: "video",
    previewUrl: PIXEL,
    ruleResults: evaluateSubmissionRules(GOOD_META, RULES),
    meta: GOOD_META,
    ...handlers,
  },
};

export const ReadOnly: Story = {
  name: "Read-only (review / history)",
  args: {
    state: "readonly",
    file: FILE,
    kind: "video",
    previewUrl: PIXEL,
    ruleResults: evaluateSubmissionRules(GOOD_META, RULES),
    meta: GOOD_META,
    ...handlers,
  },
};

export const PreviewUnavailable: Story = {
  args: {
    state: "stored",
    file: FILE,
    kind: "video",
    previewUrl: PIXEL,
    previewBroken: true,
    storedHint: true,
    ...handlers,
  },
};

export const ImageSubmission: Story = {
  args: {
    state: "ready",
    file: { name: "receipt_photo.png", size: 812_000, contentType: "image/png" },
    kind: "image",
    previewUrl: PIXEL,
    ruleResults: evaluateSubmissionRules(
      { contentType: "image/png", size: 812_000, width: 1200, height: 1600 },
      { types: ["image/png", "image/jpeg"], max_bytes: 10_485_760, min_resolution: 720 },
    ),
    meta: { width: 1200, height: 1600 },
    ...handlers,
  },
};
