import { useCallback, useContext, useEffect, useState } from 'react';
import { useAPI } from '../../../providers/ApiProvider';
import { Form, Label, Select } from '../../../components/Form';
import { ProjectContext } from '../../../providers/ProjectProvider';

const ALL_MODEL_VERSIONS = "$all-model-versions$";
const ALL_VERSIONS_OPTION = { value: ALL_MODEL_VERSIONS, label: "<All model versions>" };
const EMPTY_VERSION = "<Empty string>";

export const ProjectModelVersionSelector = ({
  name = "model_version",
  valueName = "model_version",
  apiName = "projectModelVersions",
  placeholder = "No model version selected",
  ...props
}) => {
  const api = useAPI();
  const { project } = useContext(ProjectContext);
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState([ALL_VERSIONS_OPTION]);
  const [version, setVersion] = useState(project?.[valueName] ?? ALL_MODEL_VERSIONS);

  useEffect(() => {
    setVersion(project?.[valueName] || ALL_MODEL_VERSIONS);
  }, [project?.[valueName], versions]);

  const fetchMLVersions = useCallback(async () => {
    const pk = project?.id;

    if (!pk) return;

    const modelVersions = await api.callApi(apiName, { params: { pk } });
    const versions = [ALL_VERSIONS_OPTION];

    if (modelVersions) {
      Object.entries(modelVersions).forEach(([key, value]) => {
        if (key === ALL_MODEL_VERSIONS) return;
        versions.push({ value: key, label: `${key || EMPTY_VERSION} (${value} predictions)` });
      });
    }

    setVersions(versions);
    setLoading(false);
  }, [project?.id, apiName]);

  useEffect(fetchMLVersions, [fetchMLVersions]);

  let version_text = null;

  if (version === ALL_MODEL_VERSIONS || version === null) {
    version_text = <b>All model versions will be used</b>;
  } else {
    version_text = <b>Current project model version: {version || EMPTY_VERSION}</b>;
  }

  return (
    <Form.Row columnCount={1}>
      <Label
        text="Model Version"
        description={(
          <>
            Model version allows you to specify which prediction will be shown to the annotators.
            <br />
            {version_text}
          </>
        )}
        style={{ marginTop: 16 }}
        large
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: 400,
          paddingLeft: 16,
        }}
      >
        <div style={{ flex: 1, paddingRight: 16 }}>
          <Select
            name={name}
            disabled={!versions.length}
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            options={versions}
            placeholder={loading ? "Loading ..." : placeholder}
            {...props}
          />
        </div>
      </div>
    </Form.Row>
  );
};
