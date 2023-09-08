import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Modal } from '../../../components/Modal/Modal';
import { cn } from '../../../utils/bem';
import { unique } from '../../../utils/helpers';
import "./Import.styl";
import { IconDoneimport, IconError, IconGreentech, IconInfo, IconLink, IconUpload, IconUploadfiles } from '../../../assets/icons';
import { useAPI } from '../../../providers/ApiProvider';

const importClass = cn("upload_page");
const dropzoneClass = cn("dropzone");

function flatten(nested) {
  return [].concat(...nested);
}

// Keep in sync with core.settings.SUPPORTED_EXTENSIONS on the BE.
const supportedExtensions = {
  text: ['txt'],
  audio: ['wav', 'mp3', 'flac', 'm4a', 'ogg'],
  video: ['mp4', 'webp', 'webm'],
  image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'],
  html: ['html', 'htm', 'xml'],
  timeSeries: ['csv', 'tsv'],
  common: ['csv', 'tsv', 'txt', 'json'],
};
const allSupportedExtensions = flatten(Object.values(supportedExtensions));

function getFileExtension(fileName) {
  if (!fileName) {
    return fileName;
  }
  return fileName.split('.').pop().toLowerCase();
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
      const dirPath = path + item.name + "/";

      dirReader.readEntries(function(entries) {
        Promise.all(entries.map(entry => traverseFileTree(entry, dirPath)))
          .then(flatten)
          .then(resolve);
      });
    }
  });
}

function getFiles(files) {
  // @todo this can be not a files, but text or any other draggable stuff
  return new Promise(resolve => {
    if (!files.length) return resolve([]);
    if (!files[0].webkitGetAsEntry) return resolve(files);

    // Use DataTransferItemList interface to access the file(s)
    const entries = Array.from(files).map(file => file.webkitGetAsEntry());

    Promise.all(entries.map(traverseFileTree))
      .then(flatten)
      .then(fileEntries => fileEntries.map(fileEntry => new Promise(res => fileEntry.file(res))))
      .then(filePromises => Promise.all(filePromises))
      .then(resolve);
  });
}

// const Footer = () => {
//   return (
//     <Modal.Footer>
//       <IconInfo className={importClass.elem("info-icon")} width="20" height="20" />
//       See the&nbsp;documentation to <a target="_blank" href="https://labelstud.io/guide/predictions.html">import preannotated data</a>{" "}
//       or&nbsp;to <a target="_blank" href="https://labelstud.io/guide/storage.html">sync data from a&nbsp;database or&nbsp;cloud storage</a>.
//     </Modal.Footer>
//   );
// };

const Upload = ({ children, sendFiles }) => {
  const [hovered, setHovered] = useState(false);
  const onHover = (e) => {
    e.preventDefault();
    setHovered(true);
  };
  const onLeave = setHovered.bind(null, false);
  const dropzoneRef = useRef();

  const onDrop = useCallback(e => {
    e.preventDefault();
    onLeave();
    getFiles(e.dataTransfer.items).then(files => sendFiles(files));
  }, [onLeave, sendFiles]);

  return (
    <div id="holder" className={dropzoneClass.mod({ hovered })} ref={dropzoneRef}
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
      <IconError style={{ marginRight: 8 }} />
      {error.id && `[${error.id}] `}
      {error.detail || error.message}
      {extra && ` (${extra})`}
    </div>
  );
};


export const ImportPage = ({
  project,
  show = true,
  onWaiting,
  onFileListUpdate,
  highlightCsvHandling,
  dontCommitToProject = false,
  csvHandling,
  setCsvHandling,
  addColumns,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState();
  const api = useAPI();

  const processFiles = (state, action) => {
    if (action.sending) {
      return { ...state, uploading: [...action.sending, ...state.uploading] };
    }
    if (action.sent) {
      return { ...state, uploading: state.uploading.filter(f => !action.sent.includes(f)) };
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
  const showList = Boolean(files.uploaded?.length || files.uploading?.length);

  const loadFilesList = useCallback(async (file_upload_ids) => {
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
      dispatch({ ids: files.map(f => f.id) });
    }
    return files;
  }, [project]);

  const onStart = () => {
    setLoading(true);
    setError(null);
  };
  const onError = err => {
    console.error(err);
    // @todo workaround for error about input size in a wrong html format
    if (typeof err === "string" && err.includes("RequestDataTooBig")) {
      const message = "Imported file is too big";
      const extra = err.match(/"exception_value">(.*)<\/pre>/)?.[1];

      err = { message, extra };
    }
    setError(err);
    setLoading(false);
    onWaiting?.(false);
  };
  const onFinish = useCallback(async res => {
    const { could_be_tasks_list, data_columns, file_upload_ids } = res;

    dispatch({ ids: file_upload_ids });
    if (could_be_tasks_list && !csvHandling) setCsvHandling("choose");
    setLoading(true);
    onWaiting?.(false);
    addColumns(data_columns);

    return loadFilesList(file_upload_ids).then(() => setLoading(false));
  }, [addColumns, loadFilesList, setLoading]);

  const importFiles = useCallback(async (files, body) => {
    dispatch({ sending: files });

    const query = dontCommitToProject ? { commit_to_project: "false" } : {};
    // @todo use json for dataset uploads by URL
    const contentType = body instanceof FormData
      ? 'multipart/form-data' // usual multipart for usual files
      : 'application/x-www-form-urlencoded'; // chad urlencoded for URL uploads
    const res = await api.callApi("importFiles", {
      params: { pk: project.id, ...query },
      headers: { 'Content-Type': contentType },
      body,
      errorFilter: () => true,
    });

    if (res && !res.error) onFinish?.(res);
    else onError?.(res?.response);

    dispatch({ sent: files });
  }, [project, onFinish]);

  const sendFiles = useCallback(files => {
    onStart();
    onWaiting?.(true);
    files = [...files]; // they can be array-like object
    const fd = new FormData;

    for (let f of files) {
      if (!allSupportedExtensions.includes(getFileExtension(f.name))) {
        onError(new Error(`The filetype of file "${f.name}" is not supported.`));
        return;
      }
      fd.append(f.name, f);
    }
    return importFiles(files, fd);
  }, [importFiles, onStart]);

  const onUpload = useCallback(e => {
    sendFiles(e.target.files);
    e.target.value = "";
  }, [sendFiles]);

  const onLoadURL = useCallback(e => {
    e.preventDefault();
    onStart();
    const url = urlRef.current?.value;

    if (!url) {
      setLoading(false);
      return;
    }
    urlRef.current.value = "";
    onWaiting?.(true);
    const body = new URLSearchParams({ url });

    importFiles([{ name: url }], body);
  }, [importFiles]);

  useEffect(() => {
    if (project?.id !== undefined) {
      loadFilesList().then(files => {
        if (csvHandling) return;
        // empirical guess on start if we have some possible tasks list/time series problem
        if (Array.isArray(files) && files.some(({ file }) => /\.[ct]sv$/.test(file))) {
          setCsvHandling("choose");
        }
      });
    }
  }, [project, loadFilesList]);

  const urlRef = useRef();

  if (!project) return null;
  if (!show) return null;

  const csvProps = {
    name: "csv",
    type: "radio",
    onChange: e => setCsvHandling(e.target.value),
  };

  const handlePasteFromClipboard = () => {
    // Access the clipboard data
    navigator.clipboard.readText()
      .then((clipboardData) => {
        // Assuming "urlRef" is a React ref to the input field
        if (urlRef.current) {
          // Set the clipboard data (URL) into the input field
          urlRef.current.value = clipboardData;
        }
      })
      .catch((error) => {
        console.error('Failed to read clipboard data:', error);
      });
  };



  return (
    <div className={importClass}>
      {highlightCsvHandling && <div className={importClass.elem("csv-splash")} />}
      <input id="file-input" type="file" name="file" multiple onChange={onUpload} style={{ display: "none" }} />

      <header>
        <div className={`${importClass.elem("upload-container")}`}>
          {/* Upload Files section */}
          <div className="upload-files" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <IconUploadfiles />
            <h2>Drag and drop files here</h2>
            <p>Text, Audio, Video, Image, HTML, and more</p>
            <button onClick={() => document.getElementById('file-input').click()} className={importClass.elem("upload-button")}>
              <IconUpload width="16" height="16" className={importClass.elem("upload-icon")} />
              Browse Local {files.uploaded.length ? "More " : ""}Device
            </button>
          </div>
          <div className={importClass.elem("csv-handling").mod({ highlighted: highlightCsvHandling, hidden: !csvHandling })}>
            <span>Treat CSV/TSV as</span>
            <label><input {...csvProps} value="tasks" checked={csvHandling === "tasks"} /> List of tasks</label>
            <label><input {...csvProps} value="ts" checked={csvHandling === "ts"} /> Time Series or Whole Text File</label>
          </div>
        </div>

        <div className={importClass.elem("url-container")}>
          {/* URL section */}
          <form className={importClass.elem("url-form")} method="POST" onSubmit={onLoadURL}>
            <div className={importClass.elem("button-container")}>
              <button type="button" onClick={handlePasteFromClipboard}><IconLink /></button>
            </div>
            <input placeholder="Enter Dataset URL" name="url" ref={urlRef} />
            <div className={importClass.elem("button-container")}>
              <button type="submit">+ Add URL</button>
            </div>
          </form>
        </div>

        <div className={importClass.elem("status")}>
          {files.uploaded.length ? `${files.uploaded.length} files uploaded` : null}
        </div>
      </header>



      <ErrorMessage error={error} />

      <main>
        <Upload sendFiles={sendFiles} project={project}>
          {!showList && (
            // <label htmlFor="file-input">
            //   <div className={dropzoneClass.elem("content")}>
            //     <dl>
            //       <dt>Text</dt><dd>{supportedExtensions.text.join(', ')}</dd>
            //       <dt>Audio</dt><dd>{supportedExtensions.audio.join(', ')}</dd>
            //       <dt>Video</dt><dd>mpeg4/H.264 webp, webm* {/* Keep in sync with supportedExtensions.video */}</dd>
            //       <dt>Images</dt><dd>{supportedExtensions.image.join(', ')}</dd>
            //       <dt>HTML</dt><dd>{supportedExtensions.html.join(', ')}</dd>
            //       <dt>Time Series</dt><dd>{supportedExtensions.timeSeries.join(', ')}</dd>
            //       <dt>Common Formats</dt><dd>{supportedExtensions.common.join(', ')}</dd>
            //     </dl>
            //   </div>
            // </label>
            <div className="table-container" style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              gap: '20px',
            }}>
              <div className="table-left">

                <div className={dropzoneClass.elem("content")}>
                  <h4 style={{ display: 'flex', alignItems: 'baseline', marginRight: '200px', fontWeight: 'bold' }}><IconDoneimport style={{ verticalAlign: 'middle' }} /> Support File Formats</h4>
                  <dl>
                    <dt>Common Formats</dt><dd>{supportedExtensions.common.join(', ')}</dd>
                    <dt>Text</dt><dd>{supportedExtensions.text.join(', ')}</dd>
                    <dt>Audio</dt><dd>{supportedExtensions.audio.join(', ')}</dd>
                    <dt>Video</dt><dd>mpeg4/H.264 webp, webm* {/* Keep in sync with supportedExtensions.video */}</dd>
                    <dt>Images</dt><dd>{supportedExtensions.image.join(', ')}</dd>
                    <dt>HTML</dt><dd>{supportedExtensions.html.join(', ')}</dd>
                    <dt>Time Series</dt><dd>{supportedExtensions.timeSeries.join(', ')}</dd>
                  </dl>
                </div>
              </div>

              <div className="table-right">

                {/* Add the second table here */}
                <div className={dropzoneClass.elem("content")}>
                  <h4 style={{ display: 'flex', alignItems: 'baseline', marginRight: '330px', fontWeight: 'bold' }}><IconGreentech style={{ verticalAlign: 'middle' }} /> Import File Guideline</h4>
                  <dl>
                    <dt>• Make sure you upload or import files according to your configured template</dt><dd></dd>
                    <dt>• Use cloud storages for importing a large number of files</dt><dd></dd>
                    <dt>* Video files support depends on the browser</dt><dd></dd>
                  </dl>
                </div>
              </div>
            </div>


          )}

          {showList && (
          // <table>
          //   <tbody>
          //     {files.uploading.map((file, idx) => (
          //       <tr key={`${idx}-${file.name}`}>
          //         <td>{file.name}</td>
          //         <td><span className={importClass.elem("file-status").mod({ uploading: true })} /></td>
          //       </tr>
          //     ))}
          //     {files.uploaded.map(file => (
          //       <tr key={file.file}>
          //         <td>{file.file}</td>
          //         <td><span className={importClass.elem("file-status")} /></td>
          //         <td>{file.size}</td>
          //       </tr>
          //     ))}
          //   </tbody>
          // </table>

            <table style={{ width: '140%', marginTop: '30px' }}>
              <thead>
                <tr>
                  <th style={{ 
                    fontWeight: 'normal',
                    fontSize: '1em',
                    padding: '8px',
                    textAlign: 'left',
                    borderBottom: '2px solid #e5e5e5',
                    backgroundColor: '#F2F2F2',
                  }}>File Name</th>
                  <th style={{ 
                    fontWeight: 'normal',
                    fontSize: '1em',
                    padding: '8px',
                    textAlign: 'left',
                    borderBottom: '2px solid #e5e5e5',
                    backgroundColor: '#F2F2F2',
                  }}>File Type</th>
                  <th style={{ 
                    fontWeight: 'normal',
                    fontSize: '1em',
                    padding: '8px',
                    textAlign: 'left',
                    borderBottom: '2px solid #e5e5e5',
                    backgroundColor: '#F2F2F2',
                  }}>Status</th>
                  <th style={{ 
                    fontWeight: 'normal',
                    fontSize: '1em',
                    padding: '8px',
                    textAlign: 'left',
                    borderBottom: '2px solid #e5e5e5',
                    backgroundColor: '#F2F2F2',
                  }}>File Preview</th>
                  <th style={{ 
                    fontWeight: 'normal',
                    fontSize: '1em',
                    padding: '8px',
                    textAlign: 'left',
                    borderBottom: '2px solid #e5e5e5',
                    backgroundColor: '#F2F2F2',
                  }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {files.uploading.map((file, idx) => (
                  <tr key={`${idx}-${file.name}`}>
                    <td style={{
                      padding: '8px',
                      borderBottom: '1px solid #e5e5e5',
                      textAlign: 'left',
                    }}>{file.name}</td>
                    <td style={{
                      padding: '8px',
                      borderBottom: '1px solid #e5e5e5',
                      textAlign: 'left',
                    }}>{getFileExtension(file.name)}</td>
                    <td style={{
                      padding: '8px',
                      borderBottom: '1px solid #e5e5e5',
                      textAlign: 'left',
                    }}>
                      <span className={importClass.elem("file-status").mod({ uploading: true })} />
                    </td>
                    <td style={{
                      padding: '8px',
                      borderBottom: '1px solid #e5e5e5',
                      textAlign: 'left',
                    }}>File Preview Here</td>
                    <td style={{
                      padding: '8px',
                      borderBottom: '1px solid #e5e5e5',
                      textAlign: 'left',
                    }}>
                      {/* <button onClick={() => handleDeleteFile(file)}>Delete</button> */}
                      <button>Delete</button>
                    </td>
                  </tr>
                ))}
                {files.uploaded.map(file => (
                  <tr key={file.file}>
                    <td style={{
                      padding: '8px',
                      borderBottom: '1px solid #e5e5e5',
                      textAlign: 'left',
                    }}>{file.file}</td>
                    <td style={{
                      padding: '8px',
                      borderBottom: '1px solid #e5e5e5',
                      textAlign: 'left',
                    }}>{getFileExtension(file.file)}</td>
                    <td style={{
                      padding: '8px',
                      borderBottom: '1px solid #e5e5e5',
                      textAlign: 'left',
                    }}>Imported</td>
                    <td style={{
                      padding: '8px',
                      borderBottom: '1px solid #e5e5e5',
                      textAlign: 'left',
                    }}>File Preview Here</td>
                    <td style={{
                      padding: '8px',
                      borderBottom: '1px solid #e5e5e5',
                      textAlign: 'left',
                    }}>
                      <button>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          )}
        </Upload>
      </main>

      {/* <Footer /> */}
    </div>
  );
};