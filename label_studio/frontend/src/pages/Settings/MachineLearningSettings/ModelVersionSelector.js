import { useCallback, useEffect, useState } from 'react';
import { useAPI } from '../../../providers/ApiProvider';
import { Select } from '../../../components/Form';

export const ModelVersionSelector = ({
  name = "model_version",
  valueName = "model_version",
  apiName = "modelVersions",
  placeholder = "No model version selected",
  object,
  ...props
}) => {
  const api = useAPI();
  const [versions, setVersions] = useState([]);

  const fetchMLVersions = useCallback(async () => {
    const pk = object?.id;

    if (!pk) return;

    const modelVersions = await api.callApi(apiName, {
      params: {
        pk,
      },
    });

    if (!modelVersions) return;

    setVersions(Object.entries(modelVersions).reduce((v, [key, value]) => [...v, {
      value: key,
      label: key + " (" + value + " predictions)",
    }], []));
  }, [api, object?.id, apiName]);

  useEffect(fetchMLVersions, []);

  return (
    <Select
      name={name}
      disabled={!versions.length}
      defaultValue={object?.[valueName] || null}
      options={versions}
      placeholder={placeholder}
      {...props}
    />
  );
};
