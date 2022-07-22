import { useCallback, useContext, useEffect, useState } from 'react';
import { useAPI } from '../../../providers/ApiProvider';
import { Button } from '../../../components';
import { Form, Label, Select } from '../../../components/Form';
import { ProjectContext } from '../../../providers/ProjectProvider';

export const ProjectModelVersionSelector = ({
  name = "model_version",
  valueName = "model_version",
  apiName = "projectModelVersions",
  placeholder = "No model version selected",
  ...props
}) => {
  const api = useAPI();
  const { project, updateProject } = useContext(ProjectContext);
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState([]);
  const [version, setVersion] = useState(project?.[valueName] || null);

  useEffect(() => {
    setVersion(project?.[valueName] || null);
  }, [project?.[valueName]]);

  const resetMLVersion = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    await updateProject({
      model_version: null,
    });
  }, [updateProject]);

  const fetchMLVersions = useCallback(async () => {
    const pk = project?.id;

    if (!pk) return;

    const modelVersions = await api.callApi(apiName, {
      params: {
        pk,
      },
    });

    if (modelVersions) {
      setVersions(Object.entries(modelVersions).reduce((v, [key, value]) => [...v, {
        value: key,
        label: `${key} (${value} predictions)`,
      }], []));
    }

    setLoading(false);
  }, [api, project?.id, apiName]);

  useEffect(fetchMLVersions, [fetchMLVersions]);

  return (
    <Form.Row columnCount={1}>
      <Label
        text="Model Version"
        description={(
          <>
            Model version allows you to specify which prediction will be shown to the annotators.
            {version && (
              <>
                <br />
                <b>Current project model version: {version}</b>
              </>
            )}
          </>
        )}
        style={{ marginTop: 16 }}
        large
      />

      <div style={{ display: 'flex', alignItems: 'center', width: 400, paddingLeft: 16 }}>
        <div style={{ flex: 1, paddingRight: 16 }}>
          {loading ? (
            <Select
              disabled={true}
              value={null}
              options={[]}
              placeholder={"Loading ..."}
              {...props}
            />
          )
            : (
              <Select
                name={name}
                disabled={!versions.length}
                value={version}
                onChange={e => setVersion(e.target.value)}
                options={versions}
                placeholder={placeholder}
                {...props}
              />
            )}
        </div>

        <Button onClick={resetMLVersion}>
          Reset
        </Button>
      </div>
    </Form.Row>
  );
};

