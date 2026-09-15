/**
 * The collection lifecycle, tested directly for the first time: a fake engine
 * plus a real region store drive the hook through the design's scenario
 * matrix (pick/attach, rejection, capacity, recovery filters, remove-with-
 * tombstone, replace-in-place, submitted detection, over-capacity trimming).
 */
import { act, render, waitFor } from "@testing-library/react";
import { useState } from "react";
import {
  type SubmissionCurrentUpload,
  type SubmissionEngineDeps,
  type SubmissionRegion,
  type SubmissionUploadRow,
  type CollectionSubmission,
  serializeSubmissionRegions,
  submissionFileBounds,
  submissionMediaKind,
  submissionRulesFromSchema,
  useCollectionSubmission,
} from "./use-collection-submission";

let SEQ = 0;

class FakeEngine {
  rows: SubmissionUploadRow[] = [];
  onChange: (rows: SubmissionUploadRow[]) => void;
  resolvers = new Map<string, (row: SubmissionUploadRow) => void>();
  currentAllValue: SubmissionCurrentUpload[] = [];
  discarded: number[] = [];
  cancelled: string[] = [];
  disposed = false;

  constructor(onChange: (rows: SubmissionUploadRow[]) => void) {
    this.onChange = onChange;
  }
  emit() {
    this.onChange(this.rows.map((r) => ({ ...r })));
  }
  upload(file: File): Promise<SubmissionUploadRow> {
    const row: SubmissionUploadRow = {
      clientRef: `ref-${++SEQ}`,
      uploadId: null,
      filename: file.name,
      size: file.size,
      contentType: file.type,
      status: "uploading",
      progress: 0.25,
      error: null,
      bucket: null,
      key: null,
      etag: null,
    };
    this.rows.push(row);
    this.emit();
    return new Promise((resolve) => this.resolvers.set(row.clientRef, resolve));
  }
  complete(clientRef: string, uploadId: number) {
    const row = this.rows.find((r) => r.clientRef === clientRef)!;
    row.status = "uploaded";
    row.uploadId = uploadId;
    row.bucket = "bkt";
    row.key = `intake/${uploadId}`;
    row.progress = 1;
    this.emit();
    this.resolvers.get(clientRef)?.({ ...row });
  }
  failRow(clientRef: string, message: string) {
    const row = this.rows.find((r) => r.clientRef === clientRef)!;
    row.status = "failed";
    row.error = message;
    this.emit();
    this.resolvers.get(clientRef)?.({ ...row });
  }
  retry(clientRef: string): Promise<SubmissionUploadRow | null> {
    const row = this.rows.find((r) => r.clientRef === clientRef)!;
    row.status = "uploading";
    row.error = null;
    this.emit();
    return new Promise((resolve) => this.resolvers.set(clientRef, resolve as never));
  }
  cancel(clientRef: string) {
    const row = this.rows.find((r) => r.clientRef === clientRef);
    if (row) row.status = "cancelled";
    this.cancelled.push(clientRef);
    this.emit();
  }
  discard(uploadId: number) {
    this.discarded.push(uploadId);
    return Promise.resolve();
  }
  current() {
    return Promise.resolve(null);
  }
  currentAll() {
    return Promise.resolve(this.currentAllValue);
  }
  dispose() {
    this.disposed = true;
  }
}

const pdf = (name = "doc.pdf", size = 1000) => new File([new Uint8Array(size)], name, { type: "application/pdf" });

const RULES = { types: ["application/pdf"] };
const schemaWith = (rules: Record<string, unknown>) => ({
  type: "object",
  properties: { submission: { type: "array", "x-ls-region": "submission", "x-ls-validation": rules } },
});

interface HarnessRefs {
  api: CollectionSubmission | null;
  regions: SubmissionRegion[];
  setRegions: ((regions: SubmissionRegion[]) => void) | null;
  setTaskId: ((id: number) => void) | null;
}

function makeHarness(config: {
  engine: FakeEngine | null;
  initialRegions?: SubmissionRegion[];
  readOnly?: boolean;
  capabilities?: string[];
  initialResults?: Array<{ value: { upload_id: number } }>;
  outputSchema?: Record<string, unknown> | null;
  validateFile?: (file: File, meta: unknown) => unknown;
  documentAI?: SubmissionEngineDeps["documentAI"];
}) {
  const refs: HarnessRefs = { api: null, regions: config.initialRegions || [], setRegions: null, setTaskId: null };
  const deps: SubmissionEngineDeps | null = config.engine
    ? {
        collectionUpload: { createEngine: ({ onChange }) => ((config.engine!.onChange = onChange), config.engine!) },
        documentAI: config.documentAI,
      }
    : null;

  const Host = () => {
    const [regions, setRegions] = useState<SubmissionRegion[]>(config.initialRegions || []);
    const [task, setTask] = useState({ id: 7 });
    refs.regions = regions;
    refs.setRegions = setRegions;
    refs.setTaskId = (id) => setTask({ id });
    refs.api = useCollectionSubmission({
      deps,
      props: {
        task,
        readOnly: config.readOnly,
        rpcCapabilities: new Set(config.capabilities ?? ["collectionUpload"]),
        visibleRegions: regions,
        initialResults: config.initialResults,
        outputSchema: config.outputSchema ?? schemaWith({ types: ["application/pdf"], max_files: 3, min_files: 1 }),
        fileResolverTemplate: "https://proxy/resolve/{fileuri}",
        addRegion: (r) => setRegions((p) => p.concat(r)),
        updateRegion: (id, patch) => setRegions((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r))),
        deleteRegion: (id) => setRegions((p) => p.filter((r) => r.id !== id)),
      },
      fallbackRules: RULES,
      validateFile: config.validateFile,
    });
    return null;
  };
  return { refs, Host };
}

const region = (uploadId: number, index = 0): SubmissionRegion => ({
  id: `submission-${uploadId}`,
  type: "submission",
  _submission: {
    upload_id: uploadId,
    bucket: "bkt",
    key: `intake/${uploadId}`,
    filename: `f${uploadId}.pdf`,
    size: 10,
    contentType: "application/pdf",
    index,
  },
});

const serverUpload = (uploadId: number, extra: Partial<SubmissionCurrentUpload> = {}): SubmissionCurrentUpload => ({
  upload_id: uploadId,
  bucket: "bkt",
  key: `intake/${uploadId}`,
  filename: `f${uploadId}.pdf`,
  content_type: "application/pdf",
  size: 10,
  referenced_by_annotation: false,
  ...extra,
});

describe("rules derivation", () => {
  it("prefers the schema snapshot and falls back to authored rules", () => {
    expect(submissionRulesFromSchema(schemaWith({ max_files: 4 }), RULES)).toEqual({ max_files: 4 });
    expect(submissionRulesFromSchema(null, RULES)).toBe(RULES);
    expect(submissionRulesFromSchema({ properties: { x: {} } }, RULES)).toBe(RULES);
  });
  it("bounds: undeclared means a collection of one", () => {
    expect(submissionFileBounds({})).toEqual({ min: 1, max: 1 });
    expect(submissionFileBounds({ max_files: 5, min_files: 2 } as never)).toEqual({ min: 2, max: 5 });
    expect(submissionFileBounds({ min_files: 9, max_files: 3 } as never)).toEqual({ min: 3, max: 3 });
  });
});

describe("pick → upload → attach", () => {
  it("attaches a valid pick as a region keyed by upload_id (A1)", async () => {
    const engine = new FakeEngine(() => undefined);
    const { refs, Host } = makeHarness({ engine });
    render(<Host />);
    await act(async () => refs.api!.pick([pdf("a.pdf")]));
    await waitFor(() => expect(engine.rows).toHaveLength(1));
    expect(refs.api!.members.map((m) => m.state)).toEqual(["uploading"]);
    await act(async () => engine.complete(engine.rows[0].clientRef, 101));
    await waitFor(() => expect(refs.regions).toHaveLength(1));
    expect(refs.regions[0].id).toBe("submission-101");
    expect(refs.regions[0]._submission!.index).toBe(0);
    expect(refs.api!.members.map((m) => m.state)).toEqual(["uploaded"]);
  });

  it("rejects an invalid pick without uploading (A4)", async () => {
    const engine = new FakeEngine(() => undefined);
    const { refs, Host } = makeHarness({ engine });
    render(<Host />);
    // text/plain probes instantly (kind "file") and fails the types rule -
    // video probing needs real media metadata events the test DOM lacks
    await act(async () => refs.api!.pick([new File(["x"], "notes.txt", { type: "text/plain" })]));
    await waitFor(() => expect(refs.api!.rejected).toHaveLength(1));
    expect(engine.rows).toHaveLength(0);
    expect(refs.api!.rejected[0].ruleResults.some((r) => r.status === "fail")).toBe(true);
    await act(async () => refs.api!.rejected[0].onRemove());
    expect(refs.api!.rejected).toHaveLength(0);
  });

  it("clamps picks beyond capacity into rejected entries (A3)", async () => {
    const engine = new FakeEngine(() => undefined);
    const { refs, Host } = makeHarness({ engine, initialRegions: [region(1), region(2, 1)] });
    render(<Host />);
    await act(async () => refs.api!.pick([pdf("c.pdf"), pdf("d.pdf")]));
    await waitFor(() => expect(engine.rows).toHaveLength(1)); // one free slot of 3
    expect(refs.api!.rejected).toHaveLength(1);
    expect(refs.api!.rejected[0].message).toContain("at most 3 files");
  });

  it("failed upload offers retry that attaches on success (A10)", async () => {
    const engine = new FakeEngine(() => undefined);
    const { refs, Host } = makeHarness({ engine });
    render(<Host />);
    await act(async () => refs.api!.pick([pdf("a.pdf")]));
    await waitFor(() => expect(engine.rows).toHaveLength(1));
    await act(async () => engine.failRow(engine.rows[0].clientRef, "boom"));
    await waitFor(() => expect(refs.api!.members[0].state).toBe("failed"));
    expect(refs.api!.members[0].message).toBe("boom");
    await act(async () => refs.api!.members[0].onRetry!());
    await act(async () => engine.complete(engine.rows[0].clientRef, 55));
    await waitFor(() => expect(refs.regions.map((r) => r.id)).toEqual(["submission-55"]));
  });
});

describe("recovery (self-heal)", () => {
  it("restores live unreferenced uploads up to capacity (B1/D1)", async () => {
    const engine = new FakeEngine(() => undefined);
    engine.currentAllValue = [serverUpload(11), serverUpload(12)];
    const { refs, Host } = makeHarness({ engine });
    render(<Host />);
    await waitFor(() => expect(refs.regions).toHaveLength(2));
    expect(refs.regions.map((r) => r.id)).toEqual(["submission-11", "submission-12"]);
  });

  it("never restores annotation- or history-referenced uploads (B4/C1)", async () => {
    const engine = new FakeEngine(() => undefined);
    engine.currentAllValue = [
      serverUpload(21, { referenced_by_annotation: true }),
      serverUpload(22, { referenced_by_history: true }),
      serverUpload(23),
    ];
    const { refs, Host } = makeHarness({ engine });
    render(<Host />);
    await waitFor(() => expect(refs.regions).toHaveLength(1));
    expect(refs.regions[0].id).toBe("submission-23");
  });

  it("dedupes against hydrated regions and respects capacity", async () => {
    const engine = new FakeEngine(() => undefined);
    engine.currentAllValue = [serverUpload(1), serverUpload(31), serverUpload(32), serverUpload(33)];
    const { refs, Host } = makeHarness({ engine, initialRegions: [region(1)] });
    render(<Host />);
    await waitFor(() => expect(refs.regions).toHaveLength(3)); // max 3
    expect(refs.regions.map((r) => r._submission!.upload_id)).toEqual([1, 31, 32]);
  });

  it("read-only views never heal - emptiness is the truth (B3)", async () => {
    const engine = new FakeEngine(() => undefined);
    engine.currentAllValue = [serverUpload(41)];
    const { refs, Host } = makeHarness({ engine, readOnly: true });
    render(<Host />);
    await new Promise((r) => setTimeout(r, 30));
    expect(refs.regions).toHaveLength(0);
    expect(refs.api!.collection.readonly).toBe(true);
  });
});

describe("remove", () => {
  it("tombstones, cancels the engine row, discards, deletes - no ghost (A8)", async () => {
    const engine = new FakeEngine(() => undefined);
    const { refs, Host } = makeHarness({ engine });
    render(<Host />);
    await act(async () => refs.api!.pick([pdf("a.pdf")]));
    await waitFor(() => expect(engine.rows).toHaveLength(1));
    await act(async () => engine.complete(engine.rows[0].clientRef, 66));
    await waitFor(() => expect(refs.regions).toHaveLength(1));

    await act(async () => refs.api!.members[0].onRemove!());
    await waitFor(() => expect(refs.regions).toHaveLength(0));
    expect(engine.discarded).toEqual([66]);
    expect(engine.cancelled).toHaveLength(1);
    // the completed row must NOT resurface as a member (the ghost bug)
    expect(refs.api!.members).toHaveLength(0);
    // nor may recovery re-add it while currentAll still lists it
    engine.currentAllValue = [serverUpload(66)];
    await act(async () => {
      refs.setRegions!([]);
    });
    await new Promise((r) => setTimeout(r, 30));
    expect(refs.regions).toHaveLength(0);
  });
});

describe("replace in place", () => {
  const fireReplaceInput = async (refs: HarnessRefs, file: File) => {
    await act(async () =>
      refs.api!.replaceInput.onChange({
        target: { files: [file], value: "" } as unknown as HTMLInputElement,
      }),
    );
  };

  it("binds to its own upload, not a stale failed row with the same name and size", async () => {
    const engine = new FakeEngine(() => undefined);
    const { refs, Host } = makeHarness({ engine, initialRegions: [region(70, 0)] });
    render(<Host />);
    // a failed prior pick with the same name+size sits in the engine rows
    await act(async () => refs.api!.pick([pdf("a.pdf", 2222)]));
    await waitFor(() => expect(engine.rows).toHaveLength(1));
    await act(async () => engine.failRow(engine.rows[0].clientRef, "network"));

    await act(async () => refs.api!.members[0].onReplace!());
    await fireReplaceInput(refs, pdf("a.pdf", 2222));
    await waitFor(() => expect(engine.rows).toHaveLength(2));
    // completing the replace's OWN row swaps in place; a latch onto the stale
    // failed row would plain-add a second region instead
    await act(async () => engine.complete(engine.rows[1].clientRef, 99));
    await waitFor(() => expect(refs.regions[0]._submission!.upload_id).toBe(99));
    expect(refs.regions).toHaveLength(1);
  });

  it("a cancelled replace that completes late never becomes a member", async () => {
    const engine = new FakeEngine(() => undefined);
    const { refs, Host } = makeHarness({ engine, initialRegions: [region(70, 0)] });
    render(<Host />);
    await act(async () => refs.api!.members[0].onReplace!());
    await fireReplaceInput(refs, pdf("late.pdf", 3333));
    await waitFor(() => expect(refs.api!.members[0].state).toBe("uploading"));
    const clientRef = engine.rows[0].clientRef;
    await act(async () => refs.api!.members[0].onCancel!());
    expect(engine.cancelled).toContain(clientRef);
    // the transfer finishes anyway: neither a swap nor a plain add may happen
    await act(async () => engine.complete(clientRef, 99));
    expect(refs.regions).toHaveLength(1);
    expect(refs.regions[0]._submission!.upload_id).toBe(70);
    await waitFor(() => expect(engine.discarded).toContain(99));
    expect(refs.api!.members).toHaveLength(1);
    expect(refs.api!.members[0].state).toBe("uploaded");
  });

  it("swaps the target slot, tombstones and discards the old file (A5)", async () => {
    const engine = new FakeEngine(() => undefined);
    const { refs, Host } = makeHarness({ engine, initialRegions: [region(70, 0), region(71, 1)] });
    render(<Host />);
    await act(async () => refs.api!.members[1].onReplace!());
    await fireReplaceInput(refs, pdf("new.pdf", 2222));
    await waitFor(() => expect(engine.rows).toHaveLength(1));
    // in-place progress renders on the TARGET card, not as an extra member
    expect(refs.api!.members).toHaveLength(2);
    expect(refs.api!.members[1].state).toBe("uploading");
    expect(refs.api!.members[1].file.name).toBe("new.pdf");
    await act(async () => engine.complete(engine.rows[0].clientRef, 99));
    await waitFor(() => expect(refs.regions[1]._submission!.upload_id).toBe(99));
    expect(refs.regions[1]._submission!.index).toBe(1);
    expect(engine.discarded).toEqual([71]);
    expect(refs.api!.members).toHaveLength(2);
  });

  it("failed replace keeps the original and offers retry/abort (A7)", async () => {
    const engine = new FakeEngine(() => undefined);
    const { refs, Host } = makeHarness({ engine, initialRegions: [region(80)] });
    render(<Host />);
    await act(async () => refs.api!.members[0].onReplace!());
    await fireReplaceInput(refs, pdf("new.pdf", 3333));
    await waitFor(() => expect(engine.rows).toHaveLength(1));
    await act(async () => engine.failRow(engine.rows[0].clientRef, "expired"));
    await waitFor(() => expect(refs.api!.members[0].state).toBe("failed"));
    // abort restores the original untouched
    await act(async () => refs.api!.members[0].onRemove!());
    await waitFor(() => expect(refs.api!.members[0].state).toBe("uploaded"));
    expect(refs.regions[0]._submission!.upload_id).toBe(80);
    expect(engine.discarded).toEqual([]);
  });
});

describe("submitted detection & capacity", () => {
  it("server referenced_by_annotation makes a member submitted, Replace-only (A11)", async () => {
    const engine = new FakeEngine(() => undefined);
    engine.currentAllValue = [serverUpload(90, { referenced_by_annotation: true })];
    const { refs, Host } = makeHarness({ engine, initialRegions: [region(90)] });
    render(<Host />);
    await waitFor(() => expect(refs.api!.members[0].state).toBe("submitted"));
    expect(refs.api!.members[0].onRemove).toBeUndefined();
    expect(refs.api!.members[0].onReplace).toBeDefined();
    expect(refs.api!.collection.submitted).toBe(true);
  });

  it("falls back to initialResults only when the upload capability is absent (B2)", async () => {
    const { refs, Host } = makeHarness({
      engine: new FakeEngine(() => undefined),
      initialRegions: [region(91)],
      capabilities: [],
      initialResults: [{ value: { upload_id: 91 } }],
    });
    render(<Host />);
    await waitFor(() => expect(refs.api!.members[0].state).toBe("submitted"));
  });

  it("over capacity re-enables Remove on submitted extras (C2)", async () => {
    const engine = new FakeEngine(() => undefined);
    engine.currentAllValue = [
      serverUpload(95, { referenced_by_annotation: true }),
      serverUpload(96, { referenced_by_annotation: true }),
    ];
    const { refs, Host } = makeHarness({
      engine,
      initialRegions: [region(95), region(96, 1)],
      outputSchema: schemaWith({ types: ["application/pdf"], max_files: 1 }),
    });
    render(<Host />);
    await waitFor(() => expect(refs.api!.members[0].state).toBe("submitted"));
    expect(refs.api!.capacity.over).toBe(true);
    expect(refs.api!.members[0].onRemove).toBeDefined();
    expect(refs.api!.members[1].onRemove).toBeDefined();
  });

  it("reports shortfall against min_files (C3)", async () => {
    const { refs, Host } = makeHarness({
      engine: new FakeEngine(() => undefined),
      outputSchema: schemaWith({ types: ["application/pdf"], min_files: 2, max_files: 3 }),
    });
    render(<Host />);
    await waitFor(() => expect(refs.api!.capacity.shortfall).toBe(2));
  });
});

describe("serialization", () => {
  it("renumbers indexes to member order, healing holes and legacy regions", () => {
    const out = serializeSubmissionRegions([
      { id: "submission-a", type: "submission", _submission: { upload_id: 1, index: 3 } },
      { id: "submission-b", type: "submission", _submission: { upload_id: 2 } },
      { id: "x", type: "other" } as never,
    ]);
    expect(out.map((r) => (r.value as { index: number }).index)).toEqual([0, 1]);
    expect(out.map((r) => (r.value as { upload_id: number }).upload_id)).toEqual([1, 2]);
  });
});

describe("task navigation", () => {
  it("clears per-task bookkeeping on a same-mount task switch", async () => {
    const engine = new FakeEngine(() => undefined);
    const { refs, Host } = makeHarness({ engine, initialRegions: [region(70, 0)] });
    render(<Host />);
    // tombstone upload 70 on task 7, leave a rejected card and an in-flight upload behind
    await act(async () => refs.api!.members[0].onRemove!());
    await act(async () => refs.api!.pick([new File([new Uint8Array(10)], "nope.txt", { type: "text/plain" })]));
    await waitFor(() => expect(refs.api!.rejected).toHaveLength(1));
    await act(async () => refs.api!.pick([pdf("inflight.pdf", 555)]));
    await waitFor(() => expect(refs.api!.members.some((m) => m.state === "uploading")).toBe(true));
    expect(refs.regions).toHaveLength(0);

    // same mount, different task: task 8 owns its own upload 70
    engine.currentAllValue = [serverUpload(70)];
    await act(async () => refs.setTaskId!(8));
    await waitFor(() => expect(engine.disposed).toBe(true));
    expect(refs.api!.rejected).toHaveLength(0);
    // the prior task's in-flight row must not bleed into the new task's members
    expect(refs.api!.members.some((m) => m.state === "uploading")).toBe(false);
    // the old task's tombstone must not block the new task's recovery
    await waitFor(() => expect(refs.regions.map((r) => r._submission!.upload_id)).toEqual([70]));
  });

  it("a validation still in flight when the task changes creates nothing on the next task", async () => {
    const engine = new FakeEngine(() => undefined);
    let release: (value: unknown) => void = () => undefined;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const { refs, Host } = makeHarness({ engine, validateFile: () => gate });
    render(<Host />);
    await act(async () => refs.api!.pick([new File([new Uint8Array(10)], "nope.txt", { type: "text/plain" })]));
    // navigate away while the custom validator is still pending
    await act(async () => refs.setTaskId!(11));
    await act(async () => {
      release([]);
      await gate;
    });
    expect(refs.api!.rejected).toHaveLength(0);
    expect(engine.rows).toHaveLength(0);
  });
});

describe("pdf members", () => {
  const pdfRegion = (uploadId: number): SubmissionRegion => ({
    id: `submission-${uploadId}`,
    type: "submission",
    _submission: {
      upload_id: uploadId,
      bucket: "bkt",
      key: `intake/${uploadId}.pdf`,
      filename: "deck.pdf",
      size: 10,
      contentType: "application/pdf",
      index: 0,
    },
  });

  it("maps application/pdf to the pdf kind", () => {
    expect(submissionMediaKind("deck.pdf", "application/pdf")).toBe("pdf");
    expect(submissionMediaKind("deck.pdf", null)).toBe("pdf");
    expect(submissionMediaKind("clip.mp4", "video/mp4")).toBe("video");
  });

  it("exposes one shared pager source per url when the host provides pdf.js", async () => {
    const getDocument = mock(() => ({
      promise: Promise.resolve({
        numPages: 4,
        getPage: async () => ({
          getViewport: () => ({ width: 100, height: 140 }),
          render: () => ({ promise: Promise.resolve() }),
        }),
        destroy: () => undefined,
      }),
    }));
    const engine = new FakeEngine(() => undefined);
    const { refs, Host } = makeHarness({
      engine,
      initialRegions: [pdfRegion(90)],
      documentAI: { pdfjsLib: { getDocument } as never },
    });
    render(<Host />);
    await waitFor(() => expect(refs.api!.members).toHaveLength(1));
    expect(refs.api!.members[0].kind).toBe("pdf");
    const source = refs.api!.members[0].pdf;
    expect(source).toBeDefined();
    const handle = await source!.load();
    expect(handle.pageCount).toBe(4);
    await refs.api!.members[0].pdf!.load();
    // the document is loaded once per url, shared across renders
    expect(getDocument).toHaveBeenCalledTimes(1);
  });

  it("omits the pager source when the host has no pdf.js", async () => {
    const engine = new FakeEngine(() => undefined);
    const { refs, Host } = makeHarness({ engine, initialRegions: [pdfRegion(91)] });
    render(<Host />);
    await waitFor(() => expect(refs.api!.members).toHaveLength(1));
    expect(refs.api!.members[0].kind).toBe("pdf");
    expect(refs.api!.members[0].pdf).toBeUndefined();
  });
});
