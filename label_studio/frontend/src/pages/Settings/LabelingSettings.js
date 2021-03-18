import { useCallback, useState } from 'react';
import { useHistory } from 'react-router';
import { confirm } from '../../components/Modal/Modal';
import { useAPI } from '../../providers/ApiProvider';
import { useProject } from '../../providers/ProjectProvider';
import { ConfigPage } from '../CreateProject/Config/Config';

export const LabelingSettings = () => {
  const history = useHistory();
  const {project, fetchProject} = useProject();
  const [config, setConfig] = useState("");
  const [essentialDataChanged, setEssentialDataChanged] = useState(false);
  const api = useAPI();

  const saveConfig = useCallback(async () => {
    const res = await api.callApi("updateProjectRaw", {
      params: {
        pk: project.id,
      },
      body: {
        label_config: config,
      },
    });

    if (res.ok) {
      history.push(`/projects/${project.id}/data`);
      return true;
    }

    const error = await res.json();
    fetchProject();
    return error;
  }, [project, config]);

  const onSave = useCallback(async () => {
    if (essentialDataChanged) {
      confirm({
        title: "Config data changed",
        body: "Labeling config has essential changes that affect data displaying. Saving the config may lead to deleting all tabs previously created in the Data Manager.",
        buttonLook: "destructive",
        onOk: () => saveConfig(),
        okText: "Save",
      });
    } else {
      saveConfig();
    }
  }, [essentialDataChanged, saveConfig]);

  const onUpdate = useCallback((config) => {
    setConfig(config);
    fetchProject();
  });

  const onValidate = useCallback((validation) => {
    setEssentialDataChanged(validation.config_essential_data_has_changed);
  }, []);

  if (!project.id) return null;

  return (
    <ConfigPage
      config={project.label_config}
      project={project}
      onUpdate={onUpdate}
      onSaveClick={onSave}
      onValidate={onValidate}
    />
  );
};

LabelingSettings.title = "Labeling Interface";
LabelingSettings.path = "/labeling";
