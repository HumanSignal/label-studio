import { useCallback, useState } from "react";
import { Button } from "../../../components";
import { useAPI } from "../../../providers/ApiProvider";
import { Description } from "../../../components/Description/Description";
import { Block } from "../../../utils/bem";

export const StartModelTraining = ({ backend }) => {
  const api = useAPI();
  const [response, setResponse] = useState(null);

  const onStartTraining = useCallback(
    async (backend) => {
      const res = await api.callApi("trainMLBackend", {
        params: {
          pk: backend.id,
        },
      });

      setResponse(res.response || {});
    },
    [api],
  );

  return (
    <Block name="test-request">
      <Description style={{ marginTop: 0, maxWidth: 680 }}>
        You're about to manually trigger your model's training process. This action will start the learning phase based
        on how the train method is implemented in the ML Backend. Proceed to begin this process.
        <br />
        <br />
        *Note: Currently, there is no built-in feedback loop within this interface for tracking the training progress.
        You'll need to monitor the model's training steps directly through the model's own tools and environment.
      </Description>

      {response || (
        <Button
          onClick={() => {
            onStartTraining(backend);
          }}
        >
          Start Training
        </Button>
      )}

      {response && (
        <>
          <pre>Request Sent!</pre>
          <pre>Response: {JSON.stringify(response, null, 2)}</pre>
        </>
      )}
    </Block>
  );
};
