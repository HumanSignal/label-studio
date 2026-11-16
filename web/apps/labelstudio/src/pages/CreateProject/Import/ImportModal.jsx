import { useCallback, useState } from "react";
import { useHistory } from "react-router";
import { Button, ModalWindow, Typography } from "@humansignal/ui";
import { Space } from "../../../components/Space/Space";
import { useAPI } from "../../../providers/ApiProvider";
import { ProjectProvider, useProject } from "../../../providers/ProjectProvider";
import { useFixedLocation } from "../../../providers/RoutesProvider";
import { useRefresh } from "../../../utils/hooks";
import { ImportPage } from "./Import";
import { useImportPage } from "./useImportPage";

export const Inner = () => {
  const history = useHistory();
  const location = useFixedLocation();
  const refresh = useRefresh();
  const { project } = useProject();
  const [waiting, setWaitingStatus] = useState(false);
  const [sample, setSample] = useState(null);
  const api = useAPI();

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
    backToDM();
  }, [project, fileIds, backToDM]);

  const onFinish = useCallback(async () => {
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
  }, [backToDM, finishUpload, sample]);

  return (
    <ModalWindow
      open
      onOpenChange={(open) => !open && backToDM()}
      title="Import data"
      hideHeader
      size="fullscreen"
      // Focus the dialog itself, not its first button (Delete / Cancel), so Enter does nothing on open.
      onOpenAutoFocus={(e) => e.preventDefault()}
      closeOnScrimClick={false}
      bodyClassName="flex min-h-0 flex-col p-0"
      dataTestId="import-modal"
    >
      <div className="flex items-center justify-between gap-base border-b border-neutral-border px-wide py-base">
        <Typography variant="title" size="large" aria-hidden>
          Import Data
        </Typography>

        <Space>
          <Button
            size="small"
            variant="negative"
            look="outlined"
            waiting={waiting}
            onClick={onCancel}
            aria-label="Cancel import"
          >
            Cancel
          </Button>
          <Button
            size="small"
            onClick={onFinish}
            waiting={waiting || uploading}
            disabled={uploadDisabled}
            aria-label="Finish import"
          >
            Import
          </Button>
        </Space>
      </div>
      <ImportPage
        project={project}
        sample={sample}
        onSampleDatasetSelect={setSample}
        projectConfigured={Object.keys(project.parsed_label_config ?? {}).length > 0}
        {...pageProps}
      />
    </ModalWindow>
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
