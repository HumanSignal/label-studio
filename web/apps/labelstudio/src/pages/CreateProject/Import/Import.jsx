import { ff } from "@humansignal/core";
import { SampleDatasetSelect } from "@humansignal/app-common/blocks/SampleDatasetSelect/SampleDatasetSelect";
import { IconErrorAlt, IconFileUpload, IconInfoOutline, IconTrash, IconUpload, IconCode } from "@humansignal/icons";
import { Badge } from "@humansignal/shad/components/ui/badge";
import { cn as scn } from "@humansignal/shad/utils";
import { Button } from "apps/labelstudio/src/components";
import { useAtomValue } from "jotai";
import Input from "libs/datamanager/src/components/Common/Input/Input";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useAPI } from "../../../providers/ApiProvider";
import { cn } from "../../../utils/bem";
import { unique } from "../../../utils/helpers";
import { sampleDatasetAtom } from "../utils/atoms";
import "./Import.scss";
import samples from "./samples.json";
import { importFiles } from "./utils";
import { CodeBlock, SimpleCard, Spinner, Tooltip } from "@humansignal/ui";

const importClass = cn("upload_page");
const dropzoneClass = cn("dropzone");

function flatten(nested) {
  return [].concat(...nested);
}

// Keep in sync with core.settings.SUPPORTED_EXTENSIONS on the BE.
const supportedExtensions = {
  text: ["txt"],
  audio: ["wav", "mp3", "flac", "m4a", "ogg"],
  video: ["mp4", "webm"],
  image: ["bmp", "gif", "jpg", "jpeg", "png", "svg", "webp", "tif", "tiff"],
  html: ["html", "htm", "xml"],
  pdf: ["pdf"],
  structuredData: ["csv", "tsv", "json"],
};
const allSupportedExtensions = flatten(Object.values(supportedExtensions));

function getFileExtension(fileName) {
  if (!fileName) {
    return fileName;
  }
  return fileName.split(".").pop().toLowerCase();
}

function traverseFileTree(item, path) {
  return new Promise((resolve) => {
    path = path || "";
    if (item.isFile) {
      // Avoid hidden files
      if (item.name[0] === ".") return resolve([]);

      resolve([item]);
    } else if (item.isDirectory) {
      // Get folder contents
      const dirReader = item.createReader();
      const dirPath = `${path + item.name}/`;

      dirReader.readEntries((entries) => {
        Promise.all(entries.map((entry) => traverseFileTree(entry, dirPath)))
          .then(flatten)
          .then(resolve);
      });
    }
  });
}

function getFiles(files) {
  // @todo this can be not a files, but text or any other draggable stuff
  return new Promise((resolve) => {
    if (!files.length) return resolve([]);
    if (!files[0].webkitGetAsEntry) return resolve(files);

    // Use DataTransferItemList interface to access the file(s)
    const entries = Array.from(files).map((file) => file.webkitGetAsEntry());

    Promise.all(entries.map(traverseFileTree))
      .then(flatten)
      .then((fileEntries) => fileEntries.map((fileEntry) => new Promise((res) => fileEntry.file(res))))
      .then((filePromises) => Promise.all(filePromises))
      .then(resolve);
  });
}

const Upload = ({ children, sendFiles }) => {
  const [hovered, setHovered] = useState(false);
  const onHover = (e) => {
    e.preventDefault();
    setHovered(true);
  };
  const onLeave = setHovered.bind(null, false);
  const dropzoneRef = useRef();

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      onLeave();
      getFiles(e.dataTransfer.items).then((files) => sendFiles(files));
    },
    [onLeave, sendFiles],
  );

  return (
    <div
      id="holder"
      className={dropzoneClass.mod({ hovered })}
      ref={dropzoneRef}
      onDragStart={onHover}
      onDragOver={onHover}
      onDragLeave={onLeave}
      onDrop={onDrop}
      // {...getRootProps}
    >
      {children}
    </div>
  );
};

const ErrorMessage = ({ error }) => {
  if (!error) return null;
  let extra = error.validation_errors ?? error.extra;
  // support all possible responses

  if (extra && typeof extra === "object" && !Array.isArray(extra)) {
    extra = extra.non_field_errors ?? Object.values(extra);
  }
  if (Array.isArray(extra)) extra = extra.join("; ");

  return (
    <div className={importClass.elem("error")}>
      <IconErrorAlt width="24" height="24" />
      {error.id && `[${error.id}] `}
      {error.detail || error.message}
      {extra && ` (${extra})`}
    </div>
  );
};

export const ImportPage = ({
  project,
  sample,
  show = true,
  onWaiting,
  onFileListUpdate,
  onSampleDatasetSelect,
  highlightCsvHandling,
  dontCommitToProject = false,
  csvHandling,
  setCsvHandling,
  addColumns,
  openLabelingConfig,
  setReimportExtras,
}) => {
  const [error, setError] = useState();
  const [batchId, setBatchId] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const api = useAPI();
  const projectConfigured = project?.label_config !== "<View></View>";
  const sampleConfig = useAtomValue(sampleDatasetAtom);

  const processFiles = (state, action) => {
    if (action.sending) {
      return { ...state, uploading: [...action.sending, ...state.uploading] };
    }
    if (action.sent) {
      return { ...state, uploading: state.uploading.filter((f) => !action.sent.includes(f)) };
    }
    if (action.uploaded) {
      return { ...state, uploaded: unique([...state.uploaded, ...action.uploaded], (a, b) => a.id === b.id) };
    }
    if (action.ids) {
      const ids = unique([...state.ids, ...action.ids]);

      onFileListUpdate?.(ids);
      return { ...state, ids };
    }
    return state;
  };

  const [files, dispatch] = useReducer(processFiles, { uploaded: [], uploading: [], ids: [] });
  const showList = Boolean(files.uploaded?.length || files.uploading?.length || sample);

  const loadFilesList = useCallback(
    async (file_upload_ids) => {
      const query = {};

      if (file_upload_ids) {
        // should be stringified array "[1,2]"
        query.ids = JSON.stringify(file_upload_ids);
      }
      const files = await api.callApi("fileUploads", {
        params: { pk: project.id, ...query },
      });

      dispatch({ uploaded: files ?? [] });

      if (files?.length) {
        dispatch({ ids: files.map((f) => f.id) });
      }
      return files;
    },
    [project?.id],
  );

  const onError = (err) => {
    console.error(err);
    // @todo workaround for error about input size in a wrong html format
    if (typeof err === "string" && err.includes("RequestDataTooBig")) {
      const message = "Imported file is too big";
      const extra = err.match(/"exception_value">(.*)<\/pre>/)?.[1];

      err = { message, extra };
    }
    setError(err);
    onWaiting?.(false);
  };
  const onFinish = useCallback(
    async (res) => {
      const { could_be_tasks_list, data_columns, file_upload_ids } = res;

      dispatch({ ids: file_upload_ids });
      if (could_be_tasks_list && !csvHandling) setCsvHandling("choose");
      onWaiting?.(false);
      addColumns(data_columns);

      return loadFilesList(file_upload_ids);
    },
    [addColumns, loadFilesList],
  );

  const importFilesImmediately = useCallback(
    async (files, body) => {
      // append optional tags and batch id for urlencoded or multipart forms
      if (body instanceof FormData) {
        if (batchId) body.append("import_batch_id", batchId);
        if (tags.length) body.append("import_tags", JSON.stringify(tags));
      } else if (body instanceof URLSearchParams) {
        if (batchId) body.append("import_batch_id", batchId);
        if (tags.length) body.append("import_tags", JSON.stringify(tags));
      }

      importFiles({
        files,
        body,
        project,
        onError,
        onFinish,
        onUploadStart: (files) => dispatch({ sending: files }),
        onUploadFinish: (files) => dispatch({ sent: files }),
        dontCommitToProject,
      });
    },
    [project, onFinish, batchId, tags],
  );

  const sendFiles = useCallback(
    (files) => {
      setError(null);
      onWaiting?.(true);
      files = [...files]; // they can be array-like object
      const fd = new FormData();

      for (const f of files) {
        if (!allSupportedExtensions.includes(getFileExtension(f.name))) {
          onError(new Error(`The filetype of file "${f.name}" is not supported.`));
          return;
        }
        fd.append(f.name, f);
      }
      return importFilesImmediately(files, fd);
    },
    [importFilesImmediately],
  );

  const onUpload = useCallback(
    (e) => {
      sendFiles(e.target.files);
      e.target.value = "";
    },
    [sendFiles],
  );

  const onLoadURL = useCallback(
    (e) => {
      e.preventDefault();
      setError(null);
      const url = urlRef.current?.value;

      if (!url) {
        return;
      }
      urlRef.current.value = "";
      onWaiting?.(true);
      const body = new URLSearchParams({ url });

      importFilesImmediately([{ name: url }], body);
    },
    [importFilesImmediately],
  );

  const openConfig = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      openLabelingConfig?.();
    },
    [openLabelingConfig],
  );

  useEffect(() => {
    if (project?.id !== undefined) {
      loadFilesList().then((files) => {
        if (csvHandling) return;
        // empirical guess on start if we have some possible tasks list/structured data problem
        if (Array.isArray(files) && files.some(({ file }) => /\.[ct]sv$/.test(file))) {
          setCsvHandling("choose");
        }
      });
    }
  }, [project?.id, loadFilesList]);

  // propagate metadata to the reimport step so that finishUpload sends it
  useEffect(() => {
    if (typeof setReimportExtras === "function") {
      setReimportExtras({
        import_batch_id: batchId || undefined,
        import_tags: tags,
        import_source: "ui",
      });
    }
  }, [batchId, tags, setReimportExtras]);

  const urlRef = useRef();

  if (!project) return null;
  if (!show) return null;

  const csvProps = {
    name: "csv",
    type: "radio",
    onChange: (e) => setCsvHandling(e.target.value),
  };

  return (
    <div className={importClass}>
      {highlightCsvHandling && <div className={importClass.elem("csv-splash")} />}
      <input id="file-input" type="file" name="file" multiple onChange={onUpload} style={{ display: "none" }} />

      <header className="flex gap-4">
        <div className="flex gap-2 items-center">
          <Input placeholder="Batch ID (optional)" value={batchId} onChange={(e) => setBatchId(e.target.value)} />
          <Input
            placeholder="Add import tag"
            value={tagInput}
            onChange={(e) => {
              const next = e.target.value ?? "";
              const parts = next.split(/[;,]/);
              const pending = parts.pop() ?? "";
              const newTags = parts.map((p) => p.trim()).filter(Boolean);
              if (newTags.length) {
                const merged = [...tags];
                for (const t of newTags) if (!merged.includes(t)) merged.push(t);
                setTags(merged);
              }
              setTagInput(pending);
            }}
            onBlur={() => {
              const val = (tagInput || "").trim();
              if (val && !tags.includes(val)) setTags([...tags, val]);
              setTagInput("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const val = (tagInput || "").trim();
                if (val && !tags.includes(val)) setTags([...tags, val]);
                setTagInput("");
              }
            }}
          />
          {tags.map((t) => (
            <Badge key={t} variant="secondary" className="h-6 text-xs">
              {t}
            </Badge>
          ))}
        </div>
        <form className={`${importClass.elem("url-form")} inline-flex`} method="POST" onSubmit={onLoadURL}>
          <Input placeholder="Dataset URL" name="url" ref={urlRef} style={{ height: 40 }} />
          <Button type="submit" look="primary">
            Add URL
          </Button>
        </form>
        <span>or</span>
        <Button
          type="button"
          onClick={() => document.getElementById("file-input").click()}
          className={importClass.elem("upload-button")}
        >
          <IconUpload width="16" height="16" className={importClass.elem("upload-icon")} />
          Upload {files.uploaded.length ? "More " : ""}Files
        </Button>
        {ff.isActive(ff.FF_SAMPLE_DATASETS) && (
          <SampleDatasetSelect samples={samples} sample={sample} onSampleApplied={onSampleDatasetSelect} />
        )}
        <div
          className={importClass.elem("csv-handling").mod({ highlighted: highlightCsvHandling, hidden: !csvHandling })}
        >
          <span>Treat CSV/TSV as</span>
          <label>
            <input {...csvProps} value="tasks" checked={csvHandling === "tasks"} /> List of tasks
          </label>
          <label>
            <input {...csvProps} value="ts" checked={csvHandling === "ts"} /> Time Series or Whole Text File
          </label>
        </div>
        <div className={importClass.elem("status")}>
          {files.uploaded.length ? `${files.uploaded.length} files uploaded` : ""}
        </div>
      </header>

      <ErrorMessage error={error} />

      <main>
        <Upload sendFiles={sendFiles} project={project}>
          <div className={scn("flex gap-4 w-full min-h-full", { "justify-center": !showList })}>
            {!showList && (
              <div className="flex gap-4 justify-center items-start w-full h-full">
                <label htmlFor="file-input" className="w-full h-full">
                  <div className={`${dropzoneClass.elem("content")} w-full`}>
                    <IconFileUpload height="64" className={dropzoneClass.elem("icon")} />
                    <header>
                      Drag & drop files here
                      <br />
                      or click to browse
                    </header>

                    <dl>
                      <dt>Images</dt>
                      <dd>{supportedExtensions.image.join(", ")}</dd>
                      <dt>Audio</dt>
                      <dd>{supportedExtensions.audio.join(", ")}</dd>
                      <dt>
                        <div className="flex items-center gap-1">
                          Video
                          <Tooltip title="Video format support depends on your browser. Click to learn more.">
                            <a
                              href="https://labelstud.io/tags/video#Video-format"
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center"
                              aria-label="Learn more about video format support"
                            >
                              <IconInfoOutline className="w-4 h-4 text-primary-content hover:text-primary-content-hover" />
                            </a>
                          </Tooltip>
                        </div>
                      </dt>
                      <dd>{supportedExtensions.video.join(", ")}</dd>
                      <dt>HTML / HyperText</dt>
                      <dd>{supportedExtensions.html.join(", ")}</dd>
                      <dt>Text</dt>
                      <dd>{supportedExtensions.text.join(", ")}</dd>
                      <dt>Structured data</dt>
                      <dd>{supportedExtensions.structuredData.join(", ")}</dd>
                      <dt>PDF</dt>
                      <dd>{supportedExtensions.pdf.join(", ")}</dd>
                    </dl>
                    <div className="tips">
                      <b>Important:</b>
                      <ul className="mt-2 ml-4 list-disc font-normal">
                        <li>
                          We recommend{" "}
                          <a href="https://labelstud.io/guide/storage.html" target="_blank" rel="noreferrer">
                            Cloud Storage
                          </a>{" "}
                          over direct uploads due to{" "}
                          <a href="https://labelstud.io/guide/tasks.html#Import-data-from-the-Label-Studio-UI">
                            upload limitations
                          </a>
                          .
                        </li>
                        <li>
                          For PDFs, use{" "}
                          <a href="https://labelstud.io/templates/multi-page-document-annotation">
                            multi-image labeling
                          </a>
                          . JSONL or Parquet (Enterprise only) files require cloud storage.
                        </li>
                        <li>
                          Check the documentation to{" "}
                          <a target="_blank" href="https://labelstud.io/guide/predictions.html" rel="noreferrer">
                            import preannotated data
                          </a>
                          .
                        </li>
                      </ul>
                    </div>
                  </div>
                </label>
              </div>
            )}

            {showList && (
              <div className="w-full">
                <SimpleCard title="Files" className="w-full h-full">
                  <table>
                    <tbody>
                      {sample && (
                        <tr key={sample.url}>
                          <td>
                            <div className="flex items-center gap-2">
                              {sample.title}
                              <Badge variant="info" className="h-5 text-xs rounded-sm">
                                Sample
                              </Badge>
                            </div>
                          </td>
                          <td>{sample.description}</td>
                          <td>
                            <Button
                              size="icon"
                              look="destructive"
                              rawClassName="h-6 w-6 p-0"
                              onClick={() => onSampleDatasetSelect(undefined)}
                            >
                              <IconTrash className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      )}
                      {files.uploading.map((file, idx) => (
                        <tr key={`${idx}-${file.name}`}>
                          <td>{file.name}</td>
                          <td colSpan={2}>
                            <span className={importClass.elem("file-status").mod({ uploading: true })} />
                          </td>
                        </tr>
                      ))}
                      {files.uploaded.map((file) => (
                        <tr key={file.file}>
                          <td>{file.file}</td>
                          <td>
                            <span className={importClass.elem("file-status")} />
                          </td>
                          <td>{file.size}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </SimpleCard>
              </div>
            )}

            {ff.isFF(ff.FF_JSON_PREVIEW) && (
              <div className="w-full h-full flex flex-col min-h-[400px]">
                {projectConfigured ? (
                  <SimpleCard title="Expected input preview" className="w-full h-full">
                    {sampleConfig.data ? (
                      <CodeBlock
                        title="Expected input preview"
                        code={sampleConfig?.data ?? ""}
                        className="w-full h-full"
                      />
                    ) : sampleConfig.isLoading ? (
                      <div className="w-full flex justify-center py-12">
                        <Spinner className="h-6 w-6" />
                      </div>
                    ) : sampleConfig.isError ? (
                      <div className="w-full pt-4 text-lg text-negative-content">Unable to load sample data</div>
                    ) : null}
                  </SimpleCard>
                ) : (
                  <SimpleCard className="w-full h-full flex flex-col items-center justify-center text-center p-wide">
                    <div className="flex flex-col items-center gap-tight">
                      <div className="bg-primary-background rounded-largest p-tight flex items-center justify-center">
                        <IconCode className="w-6 h-6 text-primary-icon" />
                      </div>
                      <div className="flex flex-col items-center gap-tighter">
                        <div className="text-label-small text-neutral-content font-medium">View JSON input format</div>
                        <div className="text-body-small text-neutral-content-subtler text-center">
                          Setup your{" "}
                          <button
                            type="button"
                            onClick={openConfig}
                            className="border-none bg-none p-0 m-0 text-primary-content underline hover:text-primary-content-hover transition-colors"
                          >
                            labeling configuration
                          </button>{" "}
                          first to preview the expected JSON data format
                        </div>
                      </div>
                    </div>
                  </SimpleCard>
                )}
              </div>
            )}
          </div>
        </Upload>
      </main>
    </div>
  );
};
