import { useCallback, useEffect, useState } from 'react';
import { useAPI } from '../../../providers/ApiProvider';
import { Select } from '../../../components/Form';
import { Block, Elem } from '../../../utils/bem';

import './ModelVersionSelector.styl';

export const ModelVersionSelector = ({
  name = "model_version",
  valueName = "model_version",
  apiName = "modelVersions",
  placeholder = "No model version selected",
  object,
  ...props
}) => {
  const api = useAPI();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState([]);
  const [version, setVersion] = useState(null);

  useEffect(() => {
    if (versions.length && object?.[valueName] ) {
      const selectedVersion = versions.find(version => version.value === parseInt(object?.[valueName]));

      setVersion(selectedVersion);
    }
  }, [object?.[valueName], versions]);

  const fetchMLVersions = useCallback(async () => {
    const pk = object?.id;

    if (!pk) return;

    const modelVersions = await api.callApi(apiName, {
      params: {
        pk,
      },
    });

    // handle possible error
    if (modelVersions?.message) {
      setError(modelVersions.message);
    }

    if (modelVersions?.versions?.length) {
      setVersions(modelVersions.versions.map(version => ({
        value: version,
        label: version,
      })));
    }

    setLoading(false);
  }, [object?.id, apiName]);

  useEffect(fetchMLVersions, []);

  return (
    <Block name="modelVersionSelector">
      <Select
        name={name}
        disabled={!versions.length}
        value={version}
        onChange={e => setVersion(e.target.value)}
        options={versions}
        placeholder={loading ? "Loading ..." : placeholder}
        {...props}
      />
      {error && (
        <Elem name="message">
          {error}
        </Elem>
      )}
    </Block>
  );
};
