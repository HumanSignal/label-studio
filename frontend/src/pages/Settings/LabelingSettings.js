import { useCallback, useState } from 'react';
import { useHistory } from 'react-router';
import { useAPI } from '../../providers/ApiProvider';
import { useProject } from '../../providers/ProjectProvider';
import { ConfigPage } from '../CreateProject/Config/Config';

export const LabelingSettings = () => {
  const history = useHistory();
  const {project} = useProject();
  const [config, setConfig] = useState("");
  const api = useAPI();

  const onSave = useCallback(async () => {
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
    return error;
  }, [project, config]);

  if (!project.id) return null;

  return <ConfigPage config={project.label_config} project={project} onUpdate={setConfig} onSaveClick={onSave} />;
};

LabelingSettings.title = "Labeling Interface";
LabelingSettings.path = "/labeling";
