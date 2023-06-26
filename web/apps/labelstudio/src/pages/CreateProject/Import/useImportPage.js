import React from 'react';
import { useAPI } from '../../../providers/ApiProvider';
import { unique } from '../../../utils/helpers';

const DEFAULT_COLUMN = "$undefined$";

export const useImportPage = (project) => {
  const [uploading, setUploadingStatus] = React.useState(false);
  const [fileIds, setFileIds] = React.useState([]);
  const [_columns, _setColumns] = React.useState([]);
  const addColumns = cols => _setColumns(current => unique(current.concat(cols)));
  // undefined - no csv added, all good, keep moving
  // choose - csv added, block modal until user chooses a way to hangle csv
  // tasks | ts — choice made, all good, this cannot be undone
  const [csvHandling, setCsvHandling] = React.useState(); // undefined | choose | tasks | ts
  const uploadDisabled = csvHandling === "choose";
  const api = useAPI();

  // don't use columns from csv if we'll not use it as csv
  const columns = ["choose", "ts"].includes(csvHandling) ? [DEFAULT_COLUMN] : _columns;

  const finishUpload = async () => {
    setUploadingStatus(true);
    const imported = await api.callApi('reimportFiles', {
      params: {
        pk: project.id,
      },
      body: {
        file_upload_ids: fileIds,
        files_as_tasks_list: csvHandling === 'tasks',
      },
    });

    setUploadingStatus(false);
    return imported;
  };

  const pageProps = {
    onWaiting: setUploadingStatus,
    // onDisableSubmit: onDisableSubmit,
    highlightCsvHandling: uploadDisabled,
    addColumns,
    csvHandling,
    setCsvHandling,
    onFileListUpdate: setFileIds,
    dontCommitToProject: true,
  };

  return { columns, uploading, uploadDisabled, finishUpload, fileIds, pageProps };
};
