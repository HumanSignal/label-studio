/**
 * useCollectionSubmission - the whole Data Collection submission lifecycle,
 * owned by the platform instead of each interface.
 *
 * A submission is always an ordered collection of 1..max files; "single file"
 * is a collection whose bounds are 1..1. The hook derives one membership truth
 * (stored regions ∪ in-flight rows ∪ rejected picks − tombstones, deduped by
 * upload_id), runs recovery, replace-in-place, removal and submitted
 * detection, and hands the consumer plain data + callbacks to map onto
 * MediaCard/CollectionUploader. Screens render; they never re-implement this.
 *
 * Sandbox screens reach it as `EditorUI.useCollectionSubmission(...)` - the
 * sandbox exposes the whole @humansignal/ui namespace on its own React
 * instance - and pass `EditorDeps` for the upload engine. The hook depends
 * only on structural types, so it is unit-testable with a fake engine.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MediaCardPdfSource } from "./media-card";
import {
  evaluateSubmissionRules,
  type SubmissionFileMeta,
  type SubmissionRuleResult,
  type SubmissionRules,
} from "./submission-rules";

// ---------------------------------------------------------------------------
// Structural contracts (the engine lives host-side; we never import it)
// ---------------------------------------------------------------------------

export interface SubmissionUploadRow {
  clientRef: string;
  uploadId: number | null;
  filename: string;
  size: number;
  contentType: string;
  status: "pending" | "uploading" | "uploaded" | "failed" | "cancelled";
  progress: number;
  error: string | null;
  bucket: string | null;
  key: string | null;
  etag: string | null;
}

export interface SubmissionCurrentUpload {
  upload_id: number;
  bucket: string;
  key: string;
  filename: string;
  content_type: string;
  size: number | null;
  referenced_by_annotation: boolean;
  referenced_by_history?: boolean;
}

export interface SubmissionEngine {
  rows: SubmissionUploadRow[];
  upload(file: File): Promise<SubmissionUploadRow>;
  retry(clientRef: string): Promise<SubmissionUploadRow | null>;
  cancel(clientRef: string): void;
  discard(uploadId: number): Promise<void>;
  current(uploadId?: number): Promise<SubmissionCurrentUpload | null>;
  currentAll?(): Promise<SubmissionCurrentUpload[]>;
  dispose(): void;
}

export interface SubmissionPdfDocumentLike {
  numPages: number;
  getPage(pageNumber: number): Promise<{
    getViewport(options: { scale: number }): { width: number; height: number };
    render(options: Record<string, unknown>): { promise: Promise<unknown> };
  }>;
  destroy(): void;
}

export interface SubmissionPdfjsLike {
  getDocument(source: string | Record<string, unknown>): { promise: Promise<SubmissionPdfDocumentLike> };
}

export interface SubmissionEngineDeps {
  collectionUpload?: {
    createEngine(options: { onChange: (rows: SubmissionUploadRow[]) => void }): SubmissionEngine;
  };
  /** The sandbox bundles pdf.js for Document AI screens; PDF previews reuse it. */
  documentAI?: { pdfjsLib?: SubmissionPdfjsLike };
}

export type SubmissionMediaKind = "video" | "image" | "pdf" | "file";

export interface SubmissionRegion {
  id: string;
  type: string;
  locked?: boolean;
  _submission?: {
    upload_id: number;
    bucket?: string | null;
    key?: string | null;
    filename?: string;
    size?: number | null;
    contentType?: string | null;
    etag?: string | null;
    index?: number;
  };
}

export interface SubmissionScreenProps {
  task?: { id?: number } | null;
  readOnly?: boolean;
  rpcCapabilities?: Set<string>;
  visibleRegions?: SubmissionRegion[];
  initialResults?: Array<{ value?: { upload_id?: number | string } | null } | null>;
  outputSchema?: Record<string, unknown> | null;
  fileResolverTemplate?: string | null;
  addRegion?: (region: SubmissionRegion) => void;
  updateRegion?: (id: string, region: Partial<SubmissionRegion>) => void;
  deleteRegion?: (id: string) => void;
}

export type CollectionMemberState = "uploading" | "failed" | "uploaded" | "submitted" | "readonly";

export interface CollectionMember {
  key: string;
  state: CollectionMemberState;
  file: { name: string; size?: number | null; contentType?: string | null };
  kind: SubmissionMediaKind;
  previewUrl: string | null;
  previewBroken: boolean;
  progress: number;
  message: string | null;
  ruleResults: SubmissionRuleResult[];
  meta: SubmissionFileMeta | null;
  submitted: boolean;
  storedHint: boolean;
  /** Present for PDF members when the host provides pdf.js: drives the pager. */
  pdf?: MediaCardPdfSource;
  onReplace?: () => void;
  onRemove?: () => void;
  onRetry?: () => void;
  onCancel?: () => void;
  onRetryPreview?: () => void;
  onMediaMetadata?: (meta: SubmissionFileMeta) => void;
  onPreviewError?: () => void;
}

export interface RejectedMember {
  key: string;
  file: { name: string; size?: number | null; contentType?: string | null };
  kind: SubmissionMediaKind;
  previewUrl: string | null;
  ruleResults: SubmissionRuleResult[];
  meta: SubmissionFileMeta | null;
  message: string;
  onRemove: () => void;
}

export interface CollectionSubmission {
  rules: SubmissionRules;
  accept: string;
  bounds: { min: number; max: number };
  capacity: { count: number; free: number; full: boolean; over: boolean; shortfall: number };
  members: CollectionMember[];
  rejected: RejectedMember[];
  pick: (files: File[]) => void;
  replaceInput: {
    ref: (node: HTMLInputElement | null) => void;
    type: "file";
    accept: string;
    style: { display: "none" };
    "aria-label": string;
    onChange: (event: { target: HTMLInputElement }) => void;
  };
  collection: { progress: number | null; uploadingCount: number; submitted: boolean; readonly: boolean };
  error: string | null;
}

export interface UseCollectionSubmissionOptions {
  deps: SubmissionEngineDeps | null | undefined;
  props: SubmissionScreenProps;
  /** Authored rules used when the host passes no outputSchema snapshot. */
  fallbackRules?: SubmissionRules;
  /** Fail-open custom validator (module-level `validateFile` escape hatch). */
  validateFile?: (file: File, meta: SubmissionFileMeta) => unknown;
}

// ---------------------------------------------------------------------------
// Rules - live declaration from the project's schema snapshot
// ---------------------------------------------------------------------------

export function submissionRulesFromSchema(
  schema: Record<string, unknown> | null | undefined,
  fallback: SubmissionRules,
): SubmissionRules {
  const properties = schema && typeof schema === "object" ? (schema as { properties?: unknown }).properties : null;
  if (properties && typeof properties === "object") {
    for (const key of Object.keys(properties as Record<string, unknown>)) {
      const field = (properties as Record<string, unknown>)[key];
      if (field && typeof field === "object" && (field as Record<string, unknown>)["x-ls-region"] === "submission") {
        const rules = (field as Record<string, unknown>)["x-ls-validation"];
        return rules && typeof rules === "object" && !Array.isArray(rules) ? (rules as SubmissionRules) : {};
      }
    }
  }
  return fallback;
}

export function submissionAccept(rules: SubmissionRules, fallback: SubmissionRules): string {
  const types = Array.isArray(rules.types) && rules.types.length ? rules.types : fallback.types || [];
  return types.join(",");
}

function countBound(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : null;
}

export function submissionFileBounds(rules: SubmissionRules): { min: number; max: number } {
  const max = countBound((rules as Record<string, unknown>).max_files) || 1;
  const min = Math.min(countBound((rules as Record<string, unknown>).min_files) || 1, max);
  return { min, max };
}

// ---------------------------------------------------------------------------
// File facts + preview identity
// ---------------------------------------------------------------------------

export function submissionMediaKind(name?: string | null, contentType?: string | null): SubmissionMediaKind {
  const hint = contentType || name || "";
  if (/^video\//.test(hint) || /\.(mp4|mov|webm)$/i.test(hint)) return "video";
  if (/^image\//.test(hint) || /\.(png|jpe?g|webp|gif)$/i.test(hint)) return "image";
  if (/pdf$/i.test(hint) || /\.pdf$/i.test(hint)) return "pdf";
  return "file";
}

/** Duration/dimensions from a metadata-only load of the local blob. iOS can
 * report size 0 for fresh captures - unknown, never a fact. */
export function probeSubmissionFile(file: File): Promise<SubmissionFileMeta> {
  return new Promise((resolve) => {
    const base: SubmissionFileMeta = {
      contentType: file.type || null,
      size: file.size > 0 ? file.size : undefined,
    };
    const kind = submissionMediaKind(file.name, file.type);
    if (kind !== "video" && kind !== "image") return resolve(base);
    const url = URL.createObjectURL(file);
    const done = (extra: Partial<SubmissionFileMeta>) => {
      URL.revokeObjectURL(url);
      resolve({ ...base, ...extra });
    };
    if (kind === "video") {
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.onloadedmetadata = () =>
        done({ durationSec: probe.duration, width: probe.videoWidth, height: probe.videoHeight });
      probe.onerror = () => done({});
      probe.src = url;
    } else {
      const probe = new Image();
      probe.onload = () => done({ width: probe.naturalWidth, height: probe.naturalHeight });
      probe.onerror = () => done({});
      probe.src = url;
    }
  });
}

/** Playback URL for a stored file through the host's token-proxy template.
 * Each region resolves its OWN file, so history versions play what they
 * actually reference. */
export function resolveSubmissionFileUrl(
  template: string | null | undefined,
  bucket?: string | null,
  key?: string | null,
): string | null {
  if (!template || !bucket || !key) return null;
  try {
    const b64 = btoa(`s3://${bucket}/${key}`).replace(/\+/g, "-").replace(/\//g, "_");
    return template.replace("{fileuri}", encodeURIComponent(b64));
  } catch (e) {
    return null;
  }
}

/** Blob previews keyed by storage key, scoped to ONE task at a time. Survives
 * remounts within a task (history navigation, annotation switching); moving to
 * a different task revokes every object URL and drains the cache, so a queue
 * session never accumulates blobs across tasks. Entries also drop on Remove. */
let PREVIEW_CACHE_TASK: number | undefined | null = null;
let PREVIEW_CACHE: Record<string, { url: string; kind: SubmissionMediaKind }> = {};

type PdfSourceEntry = MediaCardPdfSource & { destroySource: () => void };
let PDF_SOURCES: Record<string, PdfSourceEntry> = {};

function previewCache(taskId: number | undefined | null): typeof PREVIEW_CACHE {
  if (PREVIEW_CACHE_TASK !== taskId) {
    for (const key of Object.keys(PREVIEW_CACHE)) URL.revokeObjectURL(PREVIEW_CACHE[key].url);
    PREVIEW_CACHE = {};
    for (const key of Object.keys(PDF_SOURCES)) PDF_SOURCES[key].destroySource();
    PDF_SOURCES = {};
    PREVIEW_CACHE_TASK = taskId;
  }
  return PREVIEW_CACHE;
}

/** One shared, lazily loaded pdf.js document per URL, task-scoped like the
 * preview cache. Cards only read pages; the cache owns the handle's lifetime. */
function pdfSource(taskId: number | undefined | null, pdfjs: SubmissionPdfjsLike, url: string): MediaCardPdfSource {
  previewCache(taskId);
  const existing = PDF_SOURCES[url];
  if (existing) return existing;
  let docPromise: Promise<SubmissionPdfDocumentLike> | null = null;
  const entry: PdfSourceEntry = {
    async load() {
      if (!docPromise) docPromise = pdfjs.getDocument(url).promise;
      const doc = await docPromise;
      return {
        pageCount: doc.numPages,
        async renderPage(pageNumber: number, canvas: HTMLCanvasElement, maxWidth: number) {
          const page = await doc.getPage(pageNumber);
          const base = page.getViewport({ scale: 1 });
          const scale = Math.min(3, Math.max(0.1, maxWidth / (base.width || 1)));
          const viewport = page.getViewport({ scale });
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const canvasContext = canvas.getContext("2d");
          if (!canvasContext) return;
          await page.render({ canvasContext, viewport }).promise;
        },
      };
    },
    destroySource() {
      docPromise?.then((doc) => doc.destroy()).catch(() => undefined);
      docPromise = null;
    },
  };
  PDF_SOURCES[url] = entry;
  return entry;
}

function uploadErrorMessage(error: unknown): string {
  const raw = String((error as { message?: string })?.message || error || "");
  if (/not allowed in this embed|not available in this context|capability/i.test(raw)) {
    return "Uploads aren't available in this view. Open the task from your labeling queue to submit a file.";
  }
  return raw || "Upload failed. Please try again.";
}

async function withCustomValidation(
  results: SubmissionRuleResult[],
  file: File,
  meta: SubmissionFileMeta,
  validateFile?: UseCollectionSubmissionOptions["validateFile"],
): Promise<SubmissionRuleResult[]> {
  if (typeof validateFile !== "function") return results;
  try {
    const custom = await validateFile(file, meta);
    if (Array.isArray(custom)) {
      return results.concat(
        custom.filter((r) => r && typeof r === "object" && r.key && r.label && r.status) as SubmissionRuleResult[],
      );
    }
  } catch (error) {
    // fail-open: a broken validator must never block an upload
  }
  return results;
}

// ---------------------------------------------------------------------------
// The hook
// ---------------------------------------------------------------------------

const EMPTY_RULES: SubmissionRules = {};

let REJECT_SEQ = 0;

export function useCollectionSubmission(options: UseCollectionSubmissionOptions): CollectionSubmission {
  const { deps, props, validateFile } = options;
  const fallbackRules = options.fallbackRules || EMPTY_RULES;
  const taskId = props.task && props.task.id;

  const rules = useMemo(
    () => submissionRulesFromSchema(props.outputSchema, fallbackRules),
    [props.outputSchema, fallbackRules],
  );
  const accept = useMemo(() => submissionAccept(rules, fallbackRules), [rules, fallbackRules]);
  const bounds = useMemo(() => submissionFileBounds(rules), [rules]);

  const regions = useMemo(
    () => (props.visibleRegions || []).filter((r) => r.type === "submission" && r._submission),
    [props.visibleRegions],
  );

  const pdfjsLib = deps?.documentAI?.pdfjsLib;
  const memberPdf = useCallback(
    (kind: SubmissionMediaKind, url: string | null | undefined): MediaCardPdfSource | undefined =>
      kind === "pdf" && url && pdfjsLib ? pdfSource(taskId, pdfjsLib, url) : undefined,
    [pdfjsLib, taskId],
  );

  const isReviewer = !!(props.rpcCapabilities && props.rpcCapabilities.has("reviewAnnotation"));
  const canUpload = !!(props.rpcCapabilities && props.rpcCapabilities.has("collectionUpload"));
  const readonly = !!props.readOnly || isReviewer;

  // ---- engine ------------------------------------------------------------
  const engineRef = useRef<SubmissionEngine | null>(null);
  const engineTaskRef = useRef<number | undefined | null>(null);
  const [rows, setRows] = useState<SubmissionUploadRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const getEngine = useCallback((): SubmissionEngine | null => {
    if (engineRef.current && engineTaskRef.current === taskId) return engineRef.current;
    if (engineRef.current) engineRef.current.dispose();
    try {
      const factory = deps && deps.collectionUpload;
      if (!factory || typeof factory.createEngine !== "function") {
        throw new Error("Uploads are not available in this view.");
      }
      engineRef.current = factory.createEngine({
        onChange: (nextRows) => setRows(nextRows.map((row) => ({ ...row }))),
      });
      engineTaskRef.current = taskId;
      setRows([]);
    } catch (err) {
      engineRef.current = null;
      setError(uploadErrorMessage(err));
      return null;
    }
    return engineRef.current;
  }, [deps, taskId]);

  // One engine per task: navigating away disposes in-flight transfers so a
  // late completion can never attach to a different task.
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
        engineTaskRef.current = null;
      }
    };
  }, [taskId]);

  // ---- membership bookkeeping ---------------------------------------------
  /** Uploads the contributor explicitly removed/replaced: excluded from every
   * membership source, so a lingering engine row or a slow currentAll can
   * never resurrect them. */
  const removedUploadIds = useRef(new Set<string>());
  const pickedMetaByRef = useRef<Record<string, { meta: SubmissionFileMeta; url: string }>>({});
  const replaceTargetRef = useRef<{
    regionId: string;
    index: number;
    oldUploadId: number;
    oldKey?: string | null;
  } | null>(null);
  const replacePendingRef = useRef<
    | ({ regionId: string; index: number; oldUploadId: number; oldKey?: string | null } & {
        name: string;
        size: number;
        url: string;
        meta: SubmissionFileMeta;
        /** Bound to the engine row on its first emit; from then on the replace
         * is matched by clientRef alone (name+size can collide). */
        clientRef?: string;
        /** Engine rows that existed before this replace's upload started. */
        priorRefs?: Set<string>;
      })
    | null
  >(null);
  /** Replaces the contributor cancelled: a late completion of these rows must
   * never become a member (neither as a swap nor as a plain add). */
  const cancelledReplaceRefs = useRef(new Set<string>());
  const replaceInputElRef = useRef<HTMLInputElement | null>(null);

  const [rejectedPicks, setRejectedPicks] = useState<
    Array<{
      id: string;
      name: string;
      size: number;
      type: string | null;
      url: string;
      meta: SubmissionFileMeta;
      results: SubmissionRuleResult[];
      message: string;
    }>
  >([]);
  const [serverByUploadId, setServerByUploadId] = useState<Record<string, SubmissionCurrentUpload>>({});
  const [mediaMetaByUrl, setMediaMetaByUrl] = useState<Record<string, SubmissionFileMeta>>({});
  const [brokenPreviewUrls, setBrokenPreviewUrls] = useState<Record<string, boolean>>({});
  const [previewRetryNonce, setPreviewRetryNonce] = useState<Record<string, number>>({});

  // Session bookkeeping is per-task too: a same-mount task navigation must not
  // carry tombstones, rejected cards, a pending replace or server facts into
  // the next task. Object URLs held for in-flight picks are revoked here (the
  // per-task preview cache revokes its own on the task switch).
  const sessionTaskRef = useRef(taskId);
  useEffect(() => {
    if (sessionTaskRef.current === taskId) return;
    sessionTaskRef.current = taskId;
    previewCache(taskId);
    setRows([]);
    removedUploadIds.current = new Set();
    cancelledReplaceRefs.current = new Set();
    replacePendingRef.current = null;
    replaceTargetRef.current = null;
    for (const ref of Object.keys(pickedMetaByRef.current)) URL.revokeObjectURL(pickedMetaByRef.current[ref].url);
    pickedMetaByRef.current = {};
    setRejectedPicks((old) => {
      old.forEach((entry) => URL.revokeObjectURL(entry.url));
      return [];
    });
    setServerByUploadId({});
    setMediaMetaByUrl({});
    setBrokenPreviewUrls({});
    setPreviewRetryNonce({});
    setError(null);
  }, [taskId]);

  // ---- attach: the ONLY way an upload becomes a member ---------------------
  const { visibleRegions, addRegion, updateRegion, deleteRegion } = props;
  const attachRow = useCallback(
    (row: SubmissionUploadRow, forTaskId: number | undefined | null) => {
      if (!row || row.status !== "uploaded" || row.uploadId == null) return;
      if (forTaskId !== taskId) return;
      if (cancelledReplaceRefs.current.has(row.clientRef)) {
        // A cancelled replace that completed anyway is never a member, not as
        // a swap and not as a plain add: tombstone and discard it so neither
        // this pass nor recovery can attach it.
        removedUploadIds.current.add(String(row.uploadId));
        const engine = engineRef.current;
        if (engine) engine.discard(row.uploadId).catch(() => undefined);
        return;
      }
      if (removedUploadIds.current.has(String(row.uploadId))) return;
      const live = (visibleRegions || []).filter((r) => r.type === "submission" && r._submission);
      if (live.some((r) => String(r._submission!.upload_id) === String(row.uploadId))) return;

      const pending = replacePendingRef.current;
      const pendingMatches =
        !!pending &&
        (pending.clientRef
          ? pending.clientRef === row.clientRef
          : pending.name === row.filename && pending.size === row.size);
      if (pending && pendingMatches) {
        // Swap in place: same slot, new file. The old upload is tombstoned so
        // recovery never resurrects it, and discarded best-effort - the server
        // refuses while an annotation or history revision still needs it.
        replacePendingRef.current = null;
        removedUploadIds.current.add(String(pending.oldUploadId));
        const engine = engineRef.current;
        if (engine && pending.oldUploadId) engine.discard(pending.oldUploadId).catch(() => undefined);
        if (pending.url && row.key) {
          previewCache(taskId)[row.key] = {
            url: pending.url,
            kind: submissionMediaKind(row.filename, row.contentType),
          };
        }
        if (typeof updateRegion === "function") {
          updateRegion(pending.regionId, {
            id: `submission-${row.uploadId}`,
            type: "submission",
            _submission: {
              upload_id: row.uploadId,
              key: row.key,
              bucket: row.bucket,
              filename: row.filename,
              size: row.size,
              contentType: row.contentType,
              etag: row.etag,
              index: pending.index,
            },
          });
        }
        return;
      }

      if (live.length >= bounds.max) return;
      if (typeof addRegion !== "function") return;
      addRegion({
        id: `submission-${row.uploadId}`,
        type: "submission",
        _submission: {
          upload_id: row.uploadId,
          key: row.key,
          bucket: row.bucket,
          filename: row.filename,
          size: row.size,
          contentType: row.contentType,
          etag: row.etag,
          index: live.length,
        },
      });
      const picked = pickedMetaByRef.current[row.clientRef];
      if (picked && row.key) {
        previewCache(taskId)[row.key] = { url: picked.url, kind: submissionMediaKind(row.filename, row.contentType) };
      }
    },
    [visibleRegions, addRegion, updateRegion, taskId, bounds.max],
  );

  // Bind the in-flight replace to its engine row once, by clientRef. Name+size
  // only disambiguates rows CREATED by this replace's upload (priorRefs holds
  // the rows that already existed, so a stale failed pick with the same
  // name+size can never be latched onto), and the upload() promise result
  // overwrites the guess with the authoritative row.
  useEffect(() => {
    const pending = replacePendingRef.current;
    if (!pending || pending.clientRef) return;
    const match = rows.find(
      (row) =>
        (row.status === "pending" || row.status === "uploading" || row.status === "failed") &&
        !pending.priorRefs?.has(row.clientRef) &&
        row.filename === pending.name &&
        row.size === pending.size,
    );
    if (match) pending.clientRef = match.clientRef;
  }, [rows]);

  // Completions can land through upload()'s promise or a rows emit - either
  // path funnels through attachRow, which is idempotent by upload_id.
  useEffect(() => {
    // Rows from a task the engine no longer serves must never attach: on a
    // same-mount navigation the stale rows state still holds them for a beat.
    if (engineTaskRef.current !== taskId) return;
    rows.filter((row) => row.status === "uploaded").forEach((row) => attachRow(row, taskId));
  }, [rows, attachRow, taskId]);

  // ---- recovery + server facts ---------------------------------------------
  // Re-entrant on purpose: draft regions hydrate asynchronously, so a
  // once-per-mount pass would dedupe against a stale snapshot and duplicate
  // members. Per-upload dedupe on every run converges to exactly the live set.
  useEffect(() => {
    let cancelled = false;
    const engine = getEngine();
    if (!engine || typeof engine.currentAll !== "function") return;
    engine
      .currentAll()
      .then((uploads) => {
        if (cancelled || !Array.isArray(uploads)) return;
        const byId: Record<string, SubmissionCurrentUpload> = {};
        uploads.forEach((u) => {
          byId[String(u.upload_id)] = u;
        });
        setServerByUploadId(byId);
        if (readonly || typeof props.addRegion !== "function") return;
        const live = (props.visibleRegions || []).filter((r) => r.type === "submission" && r._submission);
        const liveIds = new Set(live.map((r) => String(r._submission!.upload_id)));
        uploads
          .filter(
            (u) =>
              // A file referenced by an annotation comes back through the
              // annotation's own regions; a file a history revision points at
              // is a superseded version kept for playback. Neither is a lost
              // draft - re-attaching them duplicates or resurrects files.
              !u.referenced_by_annotation &&
              !u.referenced_by_history &&
              !removedUploadIds.current.has(String(u.upload_id)) &&
              !liveIds.has(String(u.upload_id)),
          )
          .slice(0, Math.max(0, bounds.max - live.length))
          .forEach((u, index) => {
            props.addRegion!({
              id: `submission-${u.upload_id}`,
              type: "submission",
              _submission: {
                upload_id: u.upload_id,
                bucket: u.bucket,
                key: u.key,
                filename: u.filename,
                size: u.size,
                contentType: u.content_type,
                index: live.length + index,
              },
            });
          });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [taskId, readonly, regions.length, bounds.max, getEngine]);

  // ---- pick -----------------------------------------------------------------
  const validateAndHandle = useCallback(
    (file: File, onValid: (file: File, meta: SubmissionFileMeta, url: string) => void) => {
      const epoch = taskId;
      probeSubmissionFile(file).then(async (meta) => {
        if (sessionTaskRef.current !== epoch) return;
        const declared = evaluateSubmissionRules(meta, rules);
        const results = await withCustomValidation(declared, file, meta, validateFile);
        // The awaits above can outlive a task navigation: bail before creating
        // object URLs or rejected cards that would land on the next task.
        if (sessionTaskRef.current !== epoch) return;
        if (results.some((r) => r.status === "fail")) {
          const url = URL.createObjectURL(file);
          setRejectedPicks((old) =>
            old.concat({
              id: `rejected-${(REJECT_SEQ += 1)}`,
              name: file.name,
              size: file.size,
              type: file.type || null,
              url,
              meta,
              results,
              message: "This file doesn't meet the requirements. See the checks above and pick another file.",
            }),
          );
          return;
        }
        const url = URL.createObjectURL(file);
        onValid(file, meta, url);
      });
    },
    [rules, validateFile, taskId],
  );

  const pick = useCallback(
    (files: File[]) => {
      if (readonly || !files || !files.length) return;
      const engine = getEngine();
      if (!engine) return;
      setError(null);
      const live = (props.visibleRegions || []).filter((r) => r.type === "submission" && r._submission);
      const inFlight = rows.filter((r) => r.status === "pending" || r.status === "uploading").length;
      const free = Math.max(0, bounds.max - live.length - inFlight);
      const allowed = files.slice(0, free);
      const excess = files.slice(free);
      if (excess.length) {
        setRejectedPicks((old) =>
          old.concat(
            excess.map((file) => ({
              id: `rejected-${(REJECT_SEQ += 1)}`,
              name: file.name,
              size: file.size,
              type: file.type || null,
              url: URL.createObjectURL(file),
              meta: { contentType: file.type || null, size: file.size },
              results: [],
              message:
                bounds.max === 1
                  ? "This task takes one file. Replace the current one instead."
                  : `This task allows at most ${bounds.max} files. Remove one before adding more.`,
            })),
          ),
        );
      }
      const epoch = taskId;
      allowed.forEach((file) => {
        validateAndHandle(file, (validFile, meta, url) => {
          engine
            .upload(validFile)
            .then((row) => {
              if (sessionTaskRef.current !== epoch) {
                URL.revokeObjectURL(url);
                return;
              }
              pickedMetaByRef.current[row.clientRef] = { meta, url };
              attachRow(row, taskId);
            })
            .catch((err) => setError(uploadErrorMessage(err)));
        });
      });
    },
    [readonly, getEngine, props.visibleRegions, rows, bounds.max, validateAndHandle, attachRow, taskId],
  );

  // ---- replace ---------------------------------------------------------------
  const onReplaceInputChange = useCallback(
    (event: { target: HTMLInputElement }) => {
      const file = event.target.files && event.target.files[0];
      const target = replaceTargetRef.current;
      event.target.value = "";
      replaceTargetRef.current = null;
      const engine = getEngine();
      if (!file || !target || !engine) return;
      validateAndHandle(file, (validFile, meta, url) => {
        const priorRefs = new Set((engine.rows || []).map((row) => row.clientRef));
        const pendingEntry = {
          ...target,
          name: validFile.name,
          size: validFile.size,
          url,
          meta,
          priorRefs,
        };
        replacePendingRef.current = pendingEntry;
        const epoch = taskId;
        engine
          .upload(validFile)
          .then((row) => {
            if (sessionTaskRef.current !== epoch) {
              URL.revokeObjectURL(url);
              return;
            }
            // The promise result is the authoritative row for this replace:
            // it overwrites any earlier name+size guess.
            if (replacePendingRef.current === pendingEntry) {
              pendingEntry.clientRef = row.clientRef;
            }
            pickedMetaByRef.current[row.clientRef] = { meta, url };
            attachRow(row, taskId);
          })
          .catch((err) => {
            if (replacePendingRef.current === pendingEntry) replacePendingRef.current = null;
            setError(uploadErrorMessage(err));
          });
      });
    },
    [getEngine, validateAndHandle, attachRow, taskId],
  );

  const replaceInput = useMemo(
    () => ({
      ref: (node: HTMLInputElement | null) => {
        replaceInputElRef.current = node;
      },
      type: "file" as const,
      accept,
      style: { display: "none" as const },
      "aria-label": "Replace this file",
      onChange: onReplaceInputChange,
    }),
    [accept, onReplaceInputChange],
  );

  // ---- remove / retry / cancel -------------------------------------------------
  const removeRegion = useCallback(
    (region: SubmissionRegion) => {
      const sub = region._submission;
      const engine = engineRef.current;
      if (sub && sub.upload_id != null) {
        removedUploadIds.current.add(String(sub.upload_id));
        // The ghost fix, structural: a completed engine row for this upload
        // would otherwise re-enter membership the moment its region is gone.
        if (engine) {
          const row = engine.rows.find((r) => String(r.uploadId) === String(sub.upload_id));
          if (row) engine.cancel(row.clientRef);
          engine.discard(sub.upload_id).catch(() => undefined);
        }
        const cache = previewCache(taskId);
        if (sub.key && cache[sub.key]) {
          URL.revokeObjectURL(cache[sub.key].url);
          delete cache[sub.key];
        }
      }
      if (typeof deleteRegion === "function") deleteRegion(region.id);
    },
    [deleteRegion, taskId],
  );

  const retryRow = useCallback(
    (clientRef: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      setError(null);
      engine
        .retry(clientRef)
        .then((row) => {
          if (row) attachRow(row, taskId);
        })
        .catch((err) => setError(uploadErrorMessage(err)));
    },
    [attachRow, taskId],
  );

  const cancelRow = useCallback((clientRef: string) => {
    const engine = engineRef.current;
    if (engine) engine.cancel(clientRef);
  }, []);

  const removeRejected = useCallback((id: string) => {
    setRejectedPicks((old) => {
      const entry = old.find((r) => r.id === id);
      if (entry) URL.revokeObjectURL(entry.url);
      return old.filter((r) => r.id !== id);
    });
  }, []);

  // ---- members: the one membership truth -----------------------------------
  const pendingReplace = replacePendingRef.current;
  const replaceRow = pendingReplace
    ? rows.find(
        (row) =>
          (row.status === "pending" || row.status === "uploading" || row.status === "failed") &&
          (pendingReplace.clientRef
            ? row.clientRef === pendingReplace.clientRef
            : !pendingReplace.priorRefs?.has(row.clientRef) &&
              row.filename === pendingReplace.name &&
              row.size === pendingReplace.size),
      ) || null
    : null;

  const capacityOver = regions.length > bounds.max;

  const storedMembers: CollectionMember[] = regions.map((region) => {
    const sub = region._submission!;
    const server = serverByUploadId[String(sub.upload_id)];
    const submitted =
      !!(server && server.referenced_by_annotation) ||
      (!canUpload &&
        (props.initialResults || []).some((r) => r && r.value && String(r.value.upload_id) === String(sub.upload_id)));

    if (pendingReplace && replaceRow && pendingReplace.regionId === region.id) {
      const failed = replaceRow.status === "failed";
      const replaceKind = submissionMediaKind(replaceRow.filename, replaceRow.contentType);
      return {
        key: region.id,
        state: failed ? "failed" : "uploading",
        file: { name: replaceRow.filename, size: replaceRow.size, contentType: replaceRow.contentType },
        kind: replaceKind,
        pdf: memberPdf(replaceKind, pendingReplace.url),
        previewUrl: pendingReplace.url || null,
        previewBroken: false,
        progress: replaceRow.progress || 0,
        message: failed ? replaceRow.error || "Upload failed. Use Retry to try again" : null,
        ruleResults: pendingReplace.meta ? evaluateSubmissionRules(pendingReplace.meta, rules) : [],
        meta: pendingReplace.meta || null,
        submitted: false,
        storedHint: false,
        onCancel: () => {
          cancelledReplaceRefs.current.add(replaceRow.clientRef);
          replacePendingRef.current = null;
          cancelRow(replaceRow.clientRef);
        },
        onRetry: failed ? () => retryRow(replaceRow.clientRef) : undefined,
        onRemove: failed
          ? () => {
              cancelledReplaceRefs.current.add(replaceRow.clientRef);
              replacePendingRef.current = null;
              cancelRow(replaceRow.clientRef);
            }
          : undefined,
      };
    }

    const cached = !readonly && sub.key ? previewCache(taskId)[sub.key] : null;
    const nonce = sub.key ? previewRetryNonce[sub.key] : undefined;
    let resolvedUrl = resolveSubmissionFileUrl(props.fileResolverTemplate, sub.bucket, sub.key);
    if (resolvedUrl && nonce) resolvedUrl += (resolvedUrl.indexOf("?") === -1 ? "?" : "&") + "cb=" + nonce;
    const previewUrl = cached ? cached.url : resolvedUrl;
    const storedMeta = previewUrl ? mediaMetaByUrl[previewUrl] : null;
    const fileMeta: SubmissionFileMeta = { contentType: sub.contentType, size: sub.size, ...(storedMeta || {}) };

    const storedKind = submissionMediaKind(sub.filename, sub.contentType);
    return {
      key: region.id,
      state: readonly ? "readonly" : submitted ? "submitted" : "uploaded",
      file: { name: sub.filename || "", size: sub.size, contentType: sub.contentType },
      kind: storedKind,
      pdf: memberPdf(storedKind, previewUrl),
      previewUrl,
      previewBroken: !!(previewUrl && brokenPreviewUrls[previewUrl]),
      progress: 0,
      message: null,
      ruleResults: evaluateSubmissionRules(fileMeta, rules),
      meta: storedMeta || null,
      submitted,
      storedHint: true,
      onReplace: readonly
        ? undefined
        : () => {
            replaceTargetRef.current = {
              regionId: region.id,
              index: sub.index || 0,
              oldUploadId: sub.upload_id,
              oldKey: sub.key,
            };
            replacePendingRef.current = null;
            if (replaceInputElRef.current) replaceInputElRef.current.click();
          },
      // Submitted members are Replace-only - except when the collection is
      // over the (lowered) capacity: trimming must stay possible, and the old
      // revision keeps its files regardless (removal lands on Update).
      onRemove: readonly || (submitted && !capacityOver) ? undefined : () => removeRegion(region),
      onRetryPreview: sub.key
        ? () =>
            setPreviewRetryNonce((prior) => ({ ...prior, [sub.key as string]: (prior[sub.key as string] || 0) + 1 }))
        : undefined,
      onMediaMetadata: (mediaMeta: SubmissionFileMeta) => {
        if (!previewUrl) return;
        setMediaMetaByUrl((prior) => (prior[previewUrl] ? prior : { ...prior, [previewUrl]: mediaMeta }));
      },
      onPreviewError: () => {
        if (previewUrl) setBrokenPreviewUrls((prior) => ({ ...prior, [previewUrl]: true }));
      },
    };
  });

  const attachedIds = new Set(regions.map((r) => String(r._submission!.upload_id)));
  const rowMembers: CollectionMember[] = rows
    .filter(
      (row) =>
        row !== replaceRow &&
        !cancelledReplaceRefs.current.has(row.clientRef) &&
        !(row.uploadId != null && removedUploadIds.current.has(String(row.uploadId))) &&
        (row.status === "pending" ||
          row.status === "uploading" ||
          row.status === "failed" ||
          (row.status === "uploaded" && row.uploadId != null && !attachedIds.has(String(row.uploadId)))),
    )
    .map((row) => {
      const picked = pickedMetaByRef.current[row.clientRef];
      const failed = row.status === "failed";
      const rowKind = submissionMediaKind(row.filename, row.contentType);
      return {
        key: `row-${row.clientRef}`,
        state: failed ? "failed" : "uploading",
        file: { name: row.filename, size: row.size, contentType: row.contentType },
        kind: rowKind,
        pdf: memberPdf(rowKind, picked ? picked.url : null),
        previewUrl: picked ? picked.url : null,
        previewBroken: false,
        progress: row.progress || 0,
        message: failed ? row.error || "Upload failed. Use Retry to try again" : null,
        ruleResults: picked ? evaluateSubmissionRules(picked.meta, rules) : [],
        meta: picked ? picked.meta : null,
        submitted: false,
        storedHint: false,
        onCancel: () => cancelRow(row.clientRef),
        onRetry: failed ? () => retryRow(row.clientRef) : undefined,
        onRemove: failed ? () => cancelRow(row.clientRef) : undefined,
      };
    });

  const members = storedMembers.concat(rowMembers);

  const rejected: RejectedMember[] = rejectedPicks.map((entry) => ({
    key: entry.id,
    file: { name: entry.name, size: entry.size, contentType: entry.type },
    kind: submissionMediaKind(entry.name, entry.type),
    previewUrl: entry.url,
    ruleResults: entry.results,
    meta: entry.meta,
    message: entry.message,
    onRemove: () => removeRejected(entry.id),
  }));

  const uploadingCount =
    rowMembers.filter((m) => m.state === "uploading").length + (replaceRow && replaceRow.status !== "failed" ? 1 : 0);
  const uploadingRows = rows.filter((r) => r.status === "pending" || r.status === "uploading");
  const progress = uploadingRows.length
    ? uploadingRows.reduce((sum, r) => sum + (r.progress || 0), 0) / uploadingRows.length
    : null;

  const count = members.length;
  return {
    rules,
    accept,
    bounds,
    capacity: {
      count,
      free: Math.max(0, bounds.max - count),
      full: count >= bounds.max,
      over: capacityOver,
      shortfall: Math.max(0, bounds.min - regions.length),
    },
    members,
    rejected,
    pick,
    replaceInput,
    collection: {
      progress,
      uploadingCount,
      submitted:
        regions.length > 0 &&
        regions.every((r) => {
          const server = serverByUploadId[String(r._submission!.upload_id)];
          return !!(server && server.referenced_by_annotation);
        }),
      readonly,
    },
    error,
  };
}

/** Serialize submission regions in member order with normalized indexes -
 * removal holes and legacy un-indexed single-file regions both come out as
 * a clean 0..n-1 sequence. */
export function serializeSubmissionRegions(
  regions: Array<SubmissionRegion | null | undefined> | null | undefined,
): Array<Record<string, unknown>> {
  return (regions || [])
    .filter((r): r is SubmissionRegion => !!(r && r.type === "submission" && r._submission))
    .map((r, i) => ({
      id: r.id,
      from_name: "submission",
      to_name: "file",
      type: "submission",
      value: { ...r._submission, index: i },
      origin: "manual",
    }));
}
