import { Button, buttonVariant, ToastContext, ToastType } from "@humansignal/ui";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { generatePath, useHistory } from "react-router";
import { Link, NavLink } from "react-router-dom";
import { Spinner } from "../../components";
import { modal } from "../../components/Modal/Modal";
import { Space } from "../../components/Space/Space";
import { useAPI } from "../../providers/ApiProvider";
import { useProject } from "../../providers/ProjectProvider";
import { useContextProps, useParams } from "../../providers/RoutesProvider";
import { addCrumb, deleteCrumb } from "../../services/breadrumbs";
import { cn } from "../../utils/bem";
import { isDefined } from "../../utils/helpers";
import { ImportModal } from "../CreateProject/Import/ImportModal";
import { ExportPage } from "../ExportPage/ExportPage";
import { APIConfig } from "./api-config";

import "./DataManager.scss";

const loadDependencies = () => [import("@humansignal/datamanager"), import("@humansignal/editor")];

const initializeDataManager = async (root, props, params) => {
  if (!window.LabelStudio) throw Error("Label Studio Frontend doesn't exist on the page");
  if (!root && root.dataset.dmInitialized) return;

  root.dataset.dmInitialized = true;

  const { ...settings } = root.dataset;

  const dmConfig = {
    root,
    projectId: params.id,
    apiGateway: `${window.APP_SETTINGS.hostname}/api/dm`,
    apiVersion: 2,
    project: params.project,
    polling: window.APP_SETTINGS?.polling,
    showPreviews: false,
    apiEndpoints: APIConfig.endpoints,
    interfaces: {
      import: true,
      export: true,
      backButton: false,
      labelingHeader: false,
      autoAnnotation: params.autoAnnotation,
    },
    labelStudio: {
      keymap: window.APP_SETTINGS.editor_keymap,
    },
    ...props,
    ...settings,
  };

  return new window.DataManager(dmConfig);
};

const buildLink = (path, params) => {
  return generatePath(`/projects/:id${path}`, params);
};

export const DataManagerPage = ({ ...props }) => {
  const dependencies = useMemo(loadDependencies, []);
  const toast = useContext(ToastContext);
  const root = useRef();
  const params = useParams();
  const history = useHistory();
  const api = useAPI();
  const { project } = useProject();
  const setContextProps = useContextProps();
  const [crashed, setCrashed] = useState(false);
  const [loading, setLoading] = useState(!window.DataManager || !window.LabelStudio);
  const dataManagerRef = useRef();
  const projectId = project?.id;

  const init = useCallback(async () => {
    if (!window.LabelStudio) return;
    if (!window.DataManager) return;
    if (!root.current) return;
    if (!project?.id) return;
    if (dataManagerRef.current) return;

    const mlBackends = await api.callApi("mlBackends", {
      params: { project: project.id },
    });

    const interactiveBacked = (mlBackends ?? []).find(({ is_interactive }) => is_interactive);

    const dataManager = (dataManagerRef.current =
      dataManagerRef.current ??
      (await initializeDataManager(root.current, props, {
        ...params,
        project,
        autoAnnotation: isDefined(interactiveBacked),
      })));

    Object.assign(window, { dataManager });

    dataManager.on("crash", (details) => {
      const error = details?.error;
      const isMissingTaskError = error?.startsWith("Task ID:");
      const isMissingProjectError = error?.startsWith("Project ID:");

      if (isMissingTaskError || isMissingProjectError) {
        const message = `The ${
          isMissingTaskError ? "task" : "project"
        } you are trying to access does not exist or is no longer available.`;

        toast.show({
          message,
          type: ToastType.error,
          duration: 10000,
        });
      }

      if (isMissingTaskError) {
        history.push(buildLink("", { id: params?.id ?? project?.id }));
      } else if (isMissingProjectError) {
        history.push("/projects");
      }
    });

    dataManager.on("settingsClicked", () => {
      history.push(buildLink("/settings/labeling", { id: params?.id ?? project?.id }));
    });

    dataManager.on("importClicked", () => {
      history.push(buildLink("/data/import", { id: params?.id ?? project?.id }));
    });

    // Navigate to Storage Settings and auto-open Add Source Storage modal
    dataManager.on("openSourceStorageModal", () => {
      history.push(buildLink("/settings/storage?open=source", { id: params?.id ?? project?.id }));
    });

    dataManager.on("exportClicked", () => {
      history.push(buildLink("/data/export", { id: params?.id ?? project?.id }));
    });

    dataManager.on("error", (response) => {
      api.handleError(response);
    });

    dataManager.on("toast", ({ message, type }) => {
      toast.show({ message, type });
    });

    dataManager.on("navigate", (route) => {
      const target = route.replace(/^projects/, "");

      if (target) history.push(buildLink(target, { id: params?.id ?? project?.id }));
      else history.push("/projects");
    });

    if (interactiveBacked) {
      dataManager.on("lsf:regionFinishedDrawing", (reg, group) => {
        const { lsf, task, currentAnnotation: annotation } = dataManager.lsf;
        const ids = group.map((r) => r.cleanId);
        const result = annotation.serializeAnnotation().filter((res) => ids.includes(res.id));

        const suggestionsRequest = api.callApi("mlInteractive", {
          params: { pk: interactiveBacked.id },
          body: {
            task: task.id,
            context: { result },
          },
        });

        // we'll check that we are processing the same task
        const wrappedRequest = new Promise(async (resolve, reject) => {
          const response = await suggestionsRequest;

          // right now task might be an old task,
          // so in order to get a current one we need to get it from lsf
          if (task.id === dataManager.lsf.task.id) {
            resolve(response);
          } else {
            reject();
          }
        });

        lsf.loadSuggestions(wrappedRequest, (response) => {
          if (response.data) {
            return response.data.result;
          }

          return null;
        });
      });
    }

    setContextProps({ dmRef: dataManager });
  }, [projectId]);

  const destroyDM = useCallback(() => {
    if (dataManagerRef.current) {
      dataManagerRef.current.destroy();
      dataManagerRef.current = null;
    }
  }, []);

  useEffect(() => {
    Promise.all(dependencies)
      .then(() => setLoading(false))
      .then(init);
  }, [init]);

  useEffect(() => {
    // destroy the data manager when the component is unmounted
    return () => destroyDM();
  }, []);

  return crashed ? (
    <div className={cn("crash").toClassName()}>
      <div className={cn("crash").elem("info").toClassName()}>Project was deleted or not yet created</div>

      <Button to="/projects" aria-label="Back to projects">
        Back to projects
      </Button>
    </div>
  ) : (
    <>
      {loading && (
        <div className="flex-1 absolute inset-0 flex items-center justify-center">
          <Spinner size={64} />
        </div>
      )}
      {/* Allow this to exist before the DataManager is initialized as the async app.fetchData call eventually calls startLabeling, and that requires the root element to exist */}
      <div ref={root} className={cn("datamanager").toClassName()} />
    </>
  );
};

DataManagerPage.path = "/data";
DataManagerPage.pages = {
  ExportPage,
  ImportModal,
};
DataManagerPage.context = ({ dmRef }) => {
  const { project } = useProject();
  const [mode, setMode] = useState(dmRef?.mode ?? "explorer");

  const links = {
    "/settings": "Settings",
  };

  const updateCrumbs = (currentMode) => {
    const isExplorer = currentMode === "explorer";

    if (isExplorer) {
      deleteCrumb("dm-crumb");
    } else {
      addCrumb({
        key: "dm-crumb",
        title: "Labeling",
      });
    }
  };

  const showLabelingInstruction = (currentMode) => {
    const isLabelStream = currentMode === "labelstream";
    const { expert_instruction, show_instruction } = project;

    if (isLabelStream && show_instruction && expert_instruction) {
      modal({
        title: "Labeling Instructions",
        body: <div dangerouslySetInnerHTML={{ __html: expert_instruction }} />,
        style: { width: 680 },
      });
    }
  };

  const onDMModeChanged = (currentMode) => {
    setMode(currentMode);
    updateCrumbs(currentMode);
    showLabelingInstruction(currentMode);
  };

  useEffect(() => {
    if (dmRef) {
      dmRef.on("modeChanged", onDMModeChanged);
    }

    return () => {
      dmRef?.off?.("modeChanged", onDMModeChanged);
    };
  }, [dmRef, project]);

  return project && project.id ? (
    <Space size="small">
      {project.expert_instruction && mode !== "explorer" && (
        <Button
          size="small"
          look="outlined"
          onClick={() => {
            modal({
              title: "Instructions",
              body: () => (
                <div
                  dangerouslySetInnerHTML={{
                    __html: project.expert_instruction,
                  }}
                />
              ),
            });
          }}
        >
          Instructions
        </Button>
      )}

      {Object.entries(links).map(([path, label]) => (
        <Link
          key={path}
          tag={NavLink}
          className={buttonVariant({ size: "small", look: "outlined" })}
          to={`/projects/${project.id}${path}`}
          data-external
        >
          {label}
        </Link>
      ))}
    </Space>
  ) : null;
};
