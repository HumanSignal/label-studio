import React, { useCallback, useEffect } from "react";
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
  const [tasksToImport, setTasksToImport] = React.useState(0);
  const [usageLimits, setUsageLimits] = React.useState(null);
  const api = useAPI();
  const [reimportExtras, setReimportExtras] = React.useState({});

  // don't use columns from csv if we'll not use it as csv
  const columns = ["choose", "ts"].includes(csvHandling) ? [DEFAULT_COLUMN] : _columns;

  // Fetch usage limits
  useEffect(() => {
    if (project?.id) {
      api
        .callApi("usageLimits", {
          params: {
            project_id: project.id,
          },
        })
        .then((limits) => {
          setUsageLimits(limits);
        })
        .catch((error) => {
          console.error("Failed to fetch usage limits:", error);
        });
    }
  }, [project?.id, api]);

  // Count tasks from uploaded files
  useEffect(() => {
    if (fileIds.length > 0 && project?.id) {
      api
        .callApi("fileUploadTaskCount", {
          params: {
            pk: project.id,
          },
          body: {
            file_upload_ids: fileIds,
            files_as_tasks_list: csvHandling === "tasks",
          },
        })
        .then((response) => {
          setTasksToImport(response.task_count || 0);
        })
        .catch((error) => {
          console.error("Failed to count tasks:", error);
          setTasksToImport(0);
        });
    } else {
      setTasksToImport(0);
    }
  }, [fileIds, project?.id, csvHandling, api]);

  // Calculate if import should be disabled
  const isTaskLimitExceeded = React.useMemo(() => {
    // #region agent log
    fetch('http://localhost:7242/ingest/72ea390b-662d-4988-92ef-c2108a4eb656',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useImportPage.js:69',message:'Calculating task limit',data:{hasUsageLimits:!!usageLimits,maxTasks:usageLimits?.max_tasks,currentTasks:usageLimits?.current_tasks,tasksToImport},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    if (!usageLimits || usageLimits.max_tasks === null || usageLimits.max_tasks === undefined) {
      return false; // Unlimited
    }
    const totalTasks = (usageLimits.current_tasks || 0) + tasksToImport;
    const exceeded = totalTasks > usageLimits.max_tasks;
    // #region agent log
    fetch('http://localhost:7242/ingest/72ea390b-662d-4988-92ef-c2108a4eb656',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useImportPage.js:75',message:'Task limit calculation result',data:{totalTasks,maxTasks:usageLimits.max_tasks,exceeded},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return exceeded;
  }, [usageLimits, tasksToImport]);

  const uploadDisabled = csvHandling === "choose" || isTaskLimitExceeded;

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
        // Expected keys: file_upload_tags (object mapping file_upload_id -> [tags]), import_source (string)
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
      const { file_upload_tags, import_source } = reimportExtras || {};
      if (file_upload_tags && Object.keys(file_upload_tags).length > 0) {
        body.append("file_upload_tags", JSON.stringify(file_upload_tags));
      }
      body.append("import_source", import_source || "ui");
      await importFiles({
        files: [{ name: url }],
        body,
        project,
      });
      onFinish?.();
    },
    [project, reimportExtras],
  );

  const highlightCsvHandling = csvHandling === "choose";

  const pageProps = {
    onWaiting: setUploadingStatus,
    highlightCsvHandling,
    addColumns,
    csvHandling,
    setCsvHandling,
    onFileListUpdate: setFileIds,
    dontCommitToProject: true,
    setReimportExtras,
    tasksToImport,
    usageLimits,
    isTaskLimitExceeded,
  };

  return { columns, uploading, uploadDisabled, finishUpload, fileIds, pageProps, uploadSample };
};
