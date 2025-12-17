import React, { useCallback } from "react";
import { useAPI } from "../../../providers/ApiProvider";
import { unique } from "../../../utils/helpers";
import { importFiles } from "./utils";

const DEFAULT_COLUMN = "$undefined$";

export const useImportPage = (project, sample) => {
  const [uploading, setUploadingStatus] = React.useState(false);
  const [fileIds, setFileIds] = React.useState([]);
  const [_columns, _setColumns] = React.useState([]);
  const addColumns = (cols) => _setColumns((current) => unique(current.concat(cols)));
  // undefined - no csv added, all good, keep moving
  // choose - csv added, block modal until user chooses a way to hangle csv
  // tasks | ts — choice made, all good, this cannot be undone
  const [csvHandling, setCsvHandling] = React.useState(); // undefined | choose | tasks | ts
  const uploadDisabled = csvHandling === "choose";
  const api = useAPI();
  const [reimportExtras, setReimportExtras] = React.useState({});

  // don't use columns from csv if we'll not use it as csv
  const columns = ["choose", "ts"].includes(csvHandling) ? [DEFAULT_COLUMN] : _columns;

  const finishUpload = async () => {
    setUploadingStatus(true);
    const imported = await api.callApi("reimportFiles", {
      params: {
        pk: project.id,
      },
      body: {
        file_upload_ids: fileIds,
        files_as_tasks_list: csvHandling === "tasks",
        ...reimportExtras,
        // propagate optional import metadata captured in Import.jsx via setReimportExtras
        // Expected keys: import_batch_id (string), import_tags (array)
      },
    });

    setUploadingStatus(false);
    return imported;
  };

  const uploadSample = useCallback(
    async (sample, onStart, onFinish) => {
      onStart?.();
      const url = sample.url;
      const body = new URLSearchParams({ url });
      const { import_batch_id, import_tags } = reimportExtras || {};
      if (import_batch_id) body.append("import_batch_id", import_batch_id);
      if (Array.isArray(import_tags) && import_tags.length) body.append("import_tags", JSON.stringify(import_tags));
      body.append("import_source", "ui");
      await importFiles({
        files: [{ name: url }],
        body,
        project,
      });
      onFinish?.();
    },
    [project, reimportExtras],
  );

  const pageProps = {
    onWaiting: setUploadingStatus,
    // onDisableSubmit: onDisableSubmit,
    highlightCsvHandling: uploadDisabled,
    addColumns,
    csvHandling,
    setCsvHandling,
    onFileListUpdate: setFileIds,
    dontCommitToProject: true,
    setReimportExtras,
  };

  return { columns, uploading, uploadDisabled, finishUpload, fileIds, pageProps, uploadSample };
};
