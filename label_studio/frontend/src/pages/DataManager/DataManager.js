import { useCallback, useEffect, useRef, useState } from 'react';
import { generatePath, useHistory } from 'react-router';
import { NavLink } from 'react-router-dom';
import { Spinner } from '../../components';
import { Button } from '../../components/Button/Button';
import { modal } from '../../components/Modal/Modal';
import { Space } from '../../components/Space/Space';
import { useAPI } from '../../providers/ApiProvider';
import { useLibrary } from '../../providers/LibraryProvider';
import { useProject } from '../../providers/ProjectProvider';
import { useContextProps, useFixedLocation, useParams } from '../../providers/RoutesProvider';
import { addAction, addCrumb, deleteAction, deleteCrumb } from '../../services/breadrumbs';
import { Block, Elem } from '../../utils/bem';
import { isDefined } from '../../utils/helpers';
import { ImportModal } from '../CreateProject/Import/ImportModal';
import { ExportPage } from '../ExportPage/ExportPage';
import { APIConfig } from './api-config';
import "./DataManager.styl";

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
    polling: !window.APP_SETTINGS,
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
  const root = useRef();
  const params = useParams();
  const history = useHistory();
  const api = useAPI();
  const { project } = useProject();
  const LabelStudio = useLibrary('lsf');
  const DataManager = useLibrary('dm');
  const setContextProps = useContextProps();
  const [crashed, setCrashed] = useState(false);
  const dataManagerRef = useRef();
  const projectId = project?.id;

  const init = useCallback(async () => {
    if (!LabelStudio) return;
    if (!DataManager) return;
    if (!root.current) return;
    if (!project?.id) return;
    if (dataManagerRef.current) return;

    const mlBackends = await api.callApi("mlBackends", {
      params: { project: project.id },
    });

    const interactiveBacked = (mlBackends ?? []).find(({ is_interactive }) => is_interactive);

    const dataManager = (dataManagerRef.current = dataManagerRef.current ?? await initializeDataManager(
      root.current,
      props,
      {
        ...params,
        project,
        autoAnnotation: isDefined(interactiveBacked),
      },
    ));

    Object.assign(window, { dataManager });

    dataManager.on("crash", () => setCrashed());

    dataManager.on("settingsClicked", () => {
      history.push(buildLink("/settings/labeling", { id: params.id }));
    });

    dataManager.on("importClicked", () => {
      history.push(buildLink("/data/import", { id: params.id }));
    });

    dataManager.on("exportClicked", () => {
      history.push(buildLink("/data/export", { id: params.id }));
    });

    dataManager.on("error", response => {
      api.handleError(response);
    });

    if (interactiveBacked) {
      dataManager.on("lsf:regionFinishedDrawing", (reg, group) => {
        const { lsf, task, currentAnnotation: annotation } = dataManager.lsf;
        const ids = group.map(r => r.id);
        const result = annotation.serializeAnnotation().filter((res) => ids.includes(res.id));

        const suggestionsRequest = api.callApi("mlInteractive", {
          params: { pk: interactiveBacked.id },
          body: {
            task: task.id,
            context: { result },
          },
        });

        lsf.loadSuggestions(suggestionsRequest, (response) => {
          if (response.data) {
            return response.data.result;
          }

          return [];
        });
      });
    }

    setContextProps({ dmRef: dataManager });
  }, [LabelStudio, DataManager, projectId]);

  const destroyDM = useCallback(() => {
    if (dataManagerRef.current) {
      dataManagerRef.current.destroy();
      dataManagerRef.current = null;
    }
  }, [dataManagerRef]);

  useEffect(() => {
    init();

    return () => destroyDM();
  }, [root, init]);


  if (!DataManager || !LabelStudio) {
    return (
      <div style={{
        flex: 1,
        width: '100%',
        height: '100%',
        display: "flex",
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Spinner size={64}/>
      </div>
    );
  }

  return crashed ? (
    <Block name="crash">
      <Elem name="info">Project was deleted or not yet created</Elem>

      <Button to="/projects">
        Back to projects
      </Button>
    </Block>
  ) : (
    <Block ref={root} name="datamanager"/>
  );
};

DataManagerPage.path = "/data";
DataManagerPage.pages = {
  ExportPage,
  ImportModal,
};
DataManagerPage.context = ({ dmRef }) => {
  const location = useFixedLocation();
  const { project } = useProject();
  const [mode, setMode] = useState(dmRef?.mode ?? "explorer");

  const links = {
    '/settings': 'Settings',
  };

  const updateCrumbs = (currentMode) => {
    const isExplorer = currentMode === 'explorer';
    const dmPath = location.pathname.replace(DataManagerPage.path, '');

    if (isExplorer) {
      deleteAction(dmPath);
      deleteCrumb('dm-crumb');
    } else {
      addAction(dmPath, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dmRef?.store?.closeLabeling?.();
      });
      addCrumb({
        key: "dm-crumb",
        title: "Labeling",
      });
    }
  };

  const showLabelingInstruction = (currentMode) => {
    const isLabelStream = currentMode === 'labelstream';
    const { expert_instruction, show_instruction } = project;

    if (isLabelStream && show_instruction && expert_instruction) {
      modal({
        title: "Labeling Instructions",
        body: <div dangerouslySetInnerHTML={{ __html: expert_instruction }}/>,
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
      dmRef.on('modeChanged', onDMModeChanged);
    }

    return () => {
      dmRef?.off?.('modeChanged', onDMModeChanged);
    };
  }, [dmRef, project]);

  return project && project.id ? (
    <Space size="small">
      {(project.expert_instruction && mode !== 'explorer') && (
        <Button size="compact" onClick={() => {
          modal({
            title: "Instructions",
            body: () => <div dangerouslySetInnerHTML={{ __html: project.expert_instruction }}/>,
          });
        }}>
          Instructions
        </Button>
      )}

      {Object.entries(links).map(([path, label]) => (
        <Button
          key={path}
          tag={NavLink}
          size="compact"
          to={`/projects/${project.id}${path}`}
          data-external
        >
          {label}
        </Button>
      ))}
    </Space>
  ) : null;
};
