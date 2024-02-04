

import { useCallback, useContext, useEffect, useState } from 'react';
import { Button } from '../../../components';
import { useAPI } from '../../../providers/ApiProvider';
import { Caption } from '../../../components/Caption/Caption';
import { Description } from '../../../components/Description/Description';
import { Block, cn, Elem } from '../../../utils/bem';


export const StartModelTraining = ({ backend }) => {
  const api = useAPI();
  const [response, setResponse] = useState(null);

  const onStartTraining = useCallback(async (backend) => {
    const res = await api.callApi('trainMLBackend', {
      params: {
        pk: backend.id,
      },
    });

    setResponse(res);
    // await fetchBackends();
  }, [api]);
  
  // const sendStartModelTraining = useCallback(async (backend) => {
  //   const response = await api.callApi('predictWithML', {
  //     params: {
  //       pk: backend.id,
  //       random: true
  //     }
  //   });
    
  //   if (response) setTestResponse(response);
  // }, [setTestResponse]);
  
  return (
    <Block name="test-request">
      <Description style={{ marginTop: 0, maxWidth: 680 }}>
        You can send a manual request to the model to start training.
      </Description>
      { response || <Button onClick={() => { onStartTraining(backend) }}>Start Training</Button> }

      { response &&
        <pre>{JSON.stringify(response, null, 2)}</pre>
      }
    </Block>
  );
};

