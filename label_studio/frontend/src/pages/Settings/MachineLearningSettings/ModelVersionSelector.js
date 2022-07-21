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
  const [versions, setVersions] = useState([]);

  const fetchMLVersions = useCallback(async () => {
    const pk = object?.id;

    if (!pk) return;

    const modelVersions = await api.callApi(apiName, {
      params: {
        pk,
      },
    });

    if (modelVersions?.message) {
      setError(modelVersions.message);
    }

    if (!modelVersions?.versions?.length) return;

    setVersions(modelVersions.versions.map(version => ({
      value: version,
      label: version,
    })));
  }, [api, object?.id, apiName]);

  useEffect(fetchMLVersions, []);

  return (
    <Block name="modelVersionSelector">
      <Select
        name={name}
        disabled={!versions.length || error}
        defaultValue={object?.[valueName] || null}
        options={versions}
        placeholder={placeholder}
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
