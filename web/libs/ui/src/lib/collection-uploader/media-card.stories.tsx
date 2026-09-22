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
      options: ["uploading", "failed", "rejected", "uploaded", "submitted", "readonly"],
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
    state: "uploaded",
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
    state: "uploaded",
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
    state: "uploaded",
    file: FILE,
    kind: "video",
    previewUrl: PIXEL,
    previewBroken: true,
    storedHint: true,
    ...handlers,
  },
};

export const RowLayout: Story = {
  name: "Row (list view)",
  args: {
    state: "uploaded",
    file: FILE,
    kind: "video",
    previewUrl: PIXEL,
    layout: "row",
    storedHint: true,
    ruleResults: evaluateSubmissionRules(GOOD_META, RULES),
    meta: GOOD_META,
    ...handlers,
  },
  parameters: {
    docs: {
      description: {
        story:
          'layout="row" renders the same card data as a dense horizontal row for the CollectionUploader list view: thumb, filename + facts (first failing check inline in red), progress while uploading, status chip, right-aligned actions. CollectionUploader injects this layout automatically when the header toggle is on list — interfaces never set it by hand.',
      },
    },
  },
};

export const ImageSubmission: Story = {
  args: {
    state: "uploaded",
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

const fakePdfSource = {
  load: async () => ({
    pageCount: 5,
    async renderPage(pageNumber: number, canvas: HTMLCanvasElement, maxWidth: number) {
      const width = Math.min(maxWidth, 480);
      canvas.width = width;
      canvas.height = Math.round(width * 1.294);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#f6f5f2";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#262522";
      ctx.font = "600 28px system-ui";
      ctx.fillText(`Slide ${pageNumber}`, 32, 64);
      ctx.strokeStyle = "#c4bfb3";
      ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
    },
  }),
};

export const PdfPager: Story = {
  name: "PDF (mock pages, pager)",
  render: () => (
    <div style={{ width: 420 }}>
      <MediaCard
        state="uploaded"
        file={{ name: "pitch-deck.pdf", size: 482_113, contentType: "application/pdf" }}
        kind="pdf"
        previewUrl="mock:pdf"
        pdf={fakePdfSource}
        storedHint
      />
    </div>
  ),
};

// A real 3-page PDF (embedded, ~1.2KB) rendered through pdf.js exactly like the
// platform hook does it, worker in main-thread mode as in the sandbox.
const SAMPLE_PDF_BASE64 =
  "JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUiA0IDAgUiA1IDAgUl0gL0NvdW50IDMgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA5IDAgUiA+PiA+PiAvQ29udGVudHMgNiAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSAxMCAwIFIgPj4gPj4gL0NvbnRlbnRzIDcgMCBSID4+CmVuZG9iago1IDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgNjEyIDc5Ml0gL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgMTEgMCBSID4+ID4+IC9Db250ZW50cyA4IDAgUiA+PgplbmRvYmoKNiAwIG9iago8PCAvTGVuZ3RoIDY0ID4+CnN0cmVhbQpCVCAvRjEgNDggVGYgMTQwIDQwMCBUZCAoU2xpZGUgMSkgVGogRVQKMSB3IDEwMCAxMDAgNDAwIDYwMCByZSBTCmVuZHN0cmVhbQplbmRvYmoKNyAwIG9iago8PCAvTGVuZ3RoIDY0ID4+CnN0cmVhbQpCVCAvRjEgNDggVGYgMTQwIDQwMCBUZCAoU2xpZGUgMikgVGogRVQKMSB3IDEwMCAxMDAgNDAwIDYwMCByZSBTCmVuZHN0cmVhbQplbmRvYmoKOCAwIG9iago8PCAvTGVuZ3RoIDY0ID4+CnN0cmVhbQpCVCAvRjEgNDggVGYgMTQwIDQwMCBUZCAoU2xpZGUgMykgVGogRVQKMSB3IDEwMCAxMDAgNDAwIDYwMCByZSBTCmVuZHN0cmVhbQplbmRvYmoKOSAwIG9iago8PCAvVHlwZSAvRm9udCAvU3VidHlwZSAvVHlwZTEgL0Jhc2VGb250IC9IZWx2ZXRpY2EgPj4KZW5kb2JqCnhyZWYKMCAxMAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTI3IDAwMDAwIG4gCjAwMDAwMDAyNTMgMDAwMDAgbiAKMDAwMDAwMDM4MCAwMDAwMCBuIAowMDAwMDAwNTA3IDAwMDAwIG4gCjAwMDAwMDA2MjEgMDAwMDAgbiAKMDAwMDAwMDczNSAwMDAwMCBuIAowMDAwMDAwODQ5IDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgMTAgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjkxOQolJUVPRg==";

const realPdfSource = {
  load: async () => {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.mjs");
    (globalThis as Record<string, unknown>).pdfjsWorker = { WorkerMessageHandler: worker.WorkerMessageHandler };
    const raw = atob(SAMPLE_PDF_BASE64);
    const data = Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
    const doc = await pdfjs.getDocument({ data }).promise;
    return {
      pageCount: doc.numPages,
      async renderPage(pageNumber: number, canvas: HTMLCanvasElement, maxWidth: number) {
        const page = await doc.getPage(pageNumber);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(3, maxWidth / base.width) });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const canvasContext = canvas.getContext("2d");
        if (!canvasContext) return;
        await page.render({ canvasContext, viewport }).promise;
      },
    };
  },
};

export const PdfRealSample: Story = {
  name: "PDF (real sample via pdf.js)",
  render: () => (
    <div style={{ width: 420 }}>
      <MediaCard
        state="uploaded"
        file={{ name: "sample.pdf", size: 1_183, contentType: "application/pdf" }}
        kind="pdf"
        previewUrl="mock:sample"
        pdf={realPdfSource}
        storedHint
      />
    </div>
  ),
};
