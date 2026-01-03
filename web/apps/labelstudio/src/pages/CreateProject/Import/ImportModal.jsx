import { useCallback, useEffect, useRef, useState } from "react";
import { useHistory } from "react-router";
import { Button } from "../../../components";
import { Modal } from "../../../components/Modal/Modal";
import { Space } from "../../../components/Space/Space";
import { useAPI } from "../../../providers/ApiProvider";
import { ProjectProvider, useProject } from "../../../providers/ProjectProvider";
import { useFixedLocation } from "../../../providers/RoutesProvider";
import { Elem } from "../../../utils/bem";
import { useRefresh } from "../../../utils/hooks";
import { ImportPage } from "./Import";
import { useImportPage } from "./useImportPage";

export const Inner = () => {
  const history = useHistory();
  const location = useFixedLocation();
  const modal = useRef();
  const refresh = useRefresh();
  const { project } = useProject();
  const [waiting, setWaitingStatus] = useState(false);
  const [sample, setSample] = useState(null);
  const api = useAPI();

  // #region agent log
  useEffect(() => {
    fetch('http://localhost:7242/ingest/72ea390b-662d-4988-92ef-c2108a4eb656',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ImportModal.jsx:19',message:'ImportModal Inner rendered',data:{hasProject:!!project,projectId:project?.id,pathname:location.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  }, [project, location.pathname]);
  // #endregion

  const { uploading, uploadDisabled, finishUpload, fileIds, pageProps, uploadSample } = useImportPage(project);

  const backToDM = useCallback(() => {
    const path = location.pathname.replace(ImportModal.path, "");
    const search = location.search;
    const pathname = `${path}${search !== "?" ? search : ""}`;

    return refresh(pathname);
  }, [location, history]);

  const onCancel = useCallback(async () => {
    setWaitingStatus(true);
    await api.callApi("deleteFileUploads", {
      params: {
        pk: project.id,
      },
      body: {
        file_upload_ids: fileIds,
      },
    });
    setWaitingStatus(false);
    modal?.current?.hide();
    backToDM();
  }, [modal, project, fileIds, backToDM]);

  const onFinish = useCallback(async () => {
    if (uploadDisabled) return;

    if (sample) {
      await uploadSample(
        sample,
        () => setWaitingStatus(true),
        () => setWaitingStatus(false),
      );
    }

    const imported = await finishUpload();

    if (!imported) return;
    backToDM();
  }, [backToDM, finishUpload, sample, uploadSample, uploadDisabled]);

  return (
    <Modal
      title="Import data"
      ref={modal}
      onHide={() => backToDM()}
      closeOnClickOutside={false}
      fullscreen
      visible
      bare
    >
      <Modal.Header divided>
        <Elem block="modal" name="title">
          Import Data
        </Elem>

        <Space>
          <Button waiting={waiting} onClick={onCancel}>
            Cancel
          </Button>
          <Button look="primary" onClick={onFinish} waiting={waiting || uploading} disabled={uploadDisabled}>
            Import
          </Button>
        </Space>
      </Modal.Header>
      <ImportPage
        project={project}
        sample={sample}
        onSampleDatasetSelect={setSample}
        projectConfigured={Object.keys(project.parsed_label_config ?? {}).length > 0}
        openLabelingConfig={() => {
          history.push(`/projects/${project.id}/settings/labeling`);
        }}
        setReimportExtras={pageProps.setReimportExtras}
        tasksToImport={pageProps.tasksToImport}
        usageLimits={pageProps.usageLimits}
        {...pageProps}
      />
    </Modal>
  );
};
export const ImportModal = () => {
  return (
    <ProjectProvider>
      <Inner />
    </ProjectProvider>
  );
};

ImportModal.path = "/import";
ImportModal.modal = true;
