import { Button } from 'apps/labelstudio/src/components';
import { Page } from '../../types/Page';
import { Space } from 'apps/labelstudio/src/components/Space/Space';
import { Block } from 'apps/labelstudio/src/utils/bem';
import { EmptyList } from './@components/EmptyList/EmptyList';
import { ModelsList } from './@components/ModelsList/ModelsList';
import { useAPI } from 'apps/labelstudio/src/providers/ApiProvider';
import { useEffect, useState } from 'react';
import { Model } from './types/Model';

export const ModelsPage: Page = () => {
  const api = useAPI();
  const [data, setData] = useState<Model[]>([]);
  // const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    api.callApi<{models: Model[]}>("modelsList").then((response) => {
      if (response?.$meta.status === 200) {
        setData(response.models);
      }
    });
  }, []); // eslint-disable-line

  return (
    <Block name="prompter">
      {data.length > 0 ? (
        <ModelsList data={data}/>
      ) : (
        <EmptyList/>
      )}
    </Block>
  );
};

ModelsPage.title = () => "Models";
ModelsPage.titleRaw = "Models";
ModelsPage.path = "/models";

ModelsPage.context = () => {
  return (
    <Space size="small">
      <Button
        to="/prompt/settings"
        size="compact"
        look="primary"
      >Create Model</Button>
    </Space>
  );
};

