import React, { useCallback, useRef } from 'react';
import { Button, Form } from 'antd';

import { observer } from 'mobx-react';

const toJSON = async (annotation) => {
  const id = annotation.pk || annotation.id;
  const result = await annotation.serializeAnnotation();
  const draft = annotation.versions.draft;
  const json = { id, result };

  if (draft) json.draft = draft;
  return json;
};

const DebugComponent = ({ store }) => {
  const refConfig = useRef();
  const refData = useRef();
  const refAnnotations = useRef();

  const loadTask = useCallback(() => {
    const config = refConfig.current?.value;
    const annotations = JSON.parse(refAnnotations.current?.value || '[{ "result": [] }]');
    const data = JSON.parse(refData.current?.value);

    store.resetState();
    store.assignConfig(config);
    store.assignTask({ data });
    store.initializeStore({ annotations, predictions: [] });
    const cs = store.annotationStore;

    if (cs.annotations.length) cs.selectAnnotation(cs.annotations[0].id);
  }, []);

  const serializeCurrent = useCallback(async () => {
    const input = refAnnotations.current;

    if (!input) return;
    const annotation = store.annotationStore.selected;
    const json = await toJSON(annotation);

    input.value = JSON.stringify(json, null, 2);
  }, []);

  const serializeAll = useCallback(async () => {
    const input = refAnnotations.current;

    if (!input) return;
    const { annotations, predictions } = store.annotationStore;
    const json = await Promise.all([...annotations, ...predictions].map(toJSON));

    input.value = JSON.stringify(json, null, 2);
  }, []);

  return (
    <div style={{ width: '100%' }}>
      <br />
      <h2>Debug</h2>
      <div>
        <Button onClick={serializeAll}>↓ Serialize All Annotations</Button>
        <Button onClick={serializeCurrent}>↓ Serialize Current Annotation</Button>
        <Button onClick={loadTask}>↑ Simulate Loading Task</Button>
      </div>

      <Form>
        <div style={{ display: 'flex' }}>
          <div style={{ flexBasis: '50%' }}>
            <p>Data</p>
            <textarea
              style={{ width: '100%' }}
              ref={refData}
              rows={4}
              defaultValue={store.task.data}
              className="is-search"
            />
            <p>Config</p>
            <textarea
              style={{ width: '100%' }}
              ref={refConfig}
              rows={16}
              defaultValue={store.config}
              className="is-search"
            />
          </div>
          <div style={{ flexBasis: '50%' }}>
            <p>Annotations</p>
            <textarea
              style={{ width: '100%' }}
              ref={refAnnotations}
              rows={22}
              // defaultValue={}
              className="is-search"
            />
          </div>
        </div>
      </Form>
    </div>
  );
};

export default observer(DebugComponent);
