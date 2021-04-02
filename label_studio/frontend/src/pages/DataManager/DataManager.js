import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generatePath, useHistory, useLocation } from 'react-router';
import { NavLink } from 'react-router-dom';
import { Button } from '../../components/Button/Button';
import { modal } from '../../components/Modal/Modal';
import { Space } from '../../components/Space/Space';
import { useLibrary } from '../../providers/LibraryProvider';
import { useProject } from '../../providers/ProjectProvider';
import { useContextProps, useParams } from '../../providers/RoutesProvider';
import { addAction, addCrumb, deleteAction, deleteCrumb } from '../../services/breadrumbs';
import { Block, Elem } from '../../utils/bem';
import { humanReadableNumber } from '../../utils/helpers';
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
    polling: !window.APP_SETTINGS,
    showPreviews: false,
    apiEndpoints: APIConfig.endpoints,
    interfaces: {
      import: false,
      export: false,
      backButton: false,
      labelButton: false,
    },
    ...props,
    ...settings,
  };

  return new window.DataManager(dmConfig);
};

const buildLink = (path, params) => {
  return generatePath(`/projects/:id${path}`, params);
};

export const DataManagerPage = ({...props}) => {
  const root = useRef();
  const params = useParams();
  const history = useHistory();
  const LabelStudio = useLibrary('lsf');
  const DataManager = useLibrary('dm');
  const setContextProps = useContextProps();
  const [crashed, setCrashed] = useState(false);
  const dataManagerRef = useRef();

  const init = useCallback(async () => {
    if (!LabelStudio) return;
    if (!DataManager) return;
    if (!root.current) return;
    if (dataManagerRef.current) return;

    dataManagerRef.current = dataManagerRef.current ?? await initializeDataManager(
      root.current,
      props,
      params,
    );

    const {current: dataManager} = dataManagerRef;

    dataManager.on("crash", () => setCrashed());

    dataManager.on("settingsClicked", () => {
      history.push(buildLink("/settings/labeling", {id: params.id}));
    });

    dataManager.on("importClicked", () => {
      history.push(buildLink("/data/import", {id: params.id}));
    });

    dataManager.on("exportClicked", () => {
      history.push(buildLink("/data/export", {id: params.id}));
    });

    setContextProps({dmRef: dataManager});
  }, [LabelStudio, DataManager]);

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
DataManagerPage.context = ({dmRef}) => {
  const location = useLocation();
  const {project} = useProject();
  const [counter, setCounter] = useState(0);
  const [canLabel, setCanLabel] = useState(dmRef?.mode === 'explorer');
  const [hasLabelingData, setHasLabelingData] = useState(false);

  const links = {
    '/settings': 'Settings',
    '/data/import': "Import",
    '/data/export': 'Export',
  };

  const labelButtonText = useMemo(() => {
    return counter ? `Label (${humanReadableNumber(counter)})` : 'Label';
  }, [counter]);

  const updateCounter = useCallback((selected) => {
    setCounter(selected.total);
  }, []);

  const startLabeling = useCallback(() => {
    dmRef?.store?.startLabelStream?.();
  }, [dmRef]);

  const updateLabelingButton = (currentMode) => {
    const isExplorer = currentMode === 'explorer';
    setCanLabel(isExplorer);
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
    const {expert_instruction, show_instruction} = project;

    if (isLabelStream && show_instruction && expert_instruction) {
      modal({
        title: "Labeling Instructions",
        body: <div dangerouslySetInnerHTML={{__html: expert_instruction}}/>,
        style: { width: 680 },
      });
    }
  };

  const onDMReady = () => {
    dmRef.on("taskSelectionChanged", updateCounter);
    setCounter(dmRef.store.currentView?.selected?.total ?? 0);
    updateLabelingButton(dmRef?.mode);
  };

  const onDMModeChanged = (currentMode) => {
    updateLabelingButton(currentMode);
    updateCrumbs(currentMode);
    showLabelingInstruction(currentMode);
  };

  const onDMDataFetched = (store) => {
    setHasLabelingData(store.length !== 0);
  };

  useEffect(() => {
    if (dmRef) {
      dmRef.on('ready', onDMReady);
      dmRef.on('modeChanged', onDMModeChanged);
      dmRef.on('dataFetched', onDMDataFetched);

      updateLabelingButton(dmRef?.mode);
    }

    return () => {
      dmRef?.off?.('ready', onDMReady);
      dmRef?.off?.('modeChanged', onDMModeChanged);
      dmRef?.off?.('dataFetched', onDMDataFetched);
    };
  }, [dmRef, project]);

  return project && project.id ? (
    <Space size="small">
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

      {canLabel && (
        <Button size="compact" look="primary" disabled={!hasLabelingData} onClick={startLabeling}>
          {labelButtonText}
        </Button>
      )}
    </Space>
  ) : null;
};
