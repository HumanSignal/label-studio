
import React, { useState, useEffect} from 'react';
import { Button } from '../../../components';
import { Form, Label, Input, Toggle } from '../../../components/Form';
import { Elem, Block } from '../../../utils/bem';
import { cloneDeep } from 'lodash';
import { LsCross } from '../../../assets/icons';
import "./WebhookPage.styl";
import { useAPI } from '../../../providers/ApiProvider';


const WebhookDetail = ({ webhook, webhooksInfo, fetchWebhooks, onBack }) => {

  const api = useAPI(); 
  const [headers, setHeaders] = useState(null);
  const [sendForAllActions, setSendForAllActions] = useState(null);
  const [actions, setActions] = useState(null);

  const onAddHeaderClick = () => {
    if (!(headers.find(([k]) => k === ''))) {
      setHeaders([...headers, ['', '']]);
    }
  };
  const onHeaderRemove = (index) => {
    let newHeaders = cloneDeep(headers);
    newHeaders.splice(index, 1);
    setHeaders(newHeaders);
  };
  const onHeaderChange = (aim, event, index) => {
    let newHeaders = cloneDeep(headers);
    if (aim === 'key') {
      newHeaders[index][0] = event.target.value;
    }
    if (aim === 'value') {
      newHeaders[index][1] = event.target.value;
    }
    setHeaders(newHeaders);
  };

  const onActionChange = (event) => {
    let newActions = new Set(actions);
    if (event.target.checked) {
      newActions.add(event.target.name);
    } else {
      newActions.delete(event.target.name);
    }
    setActions(newActions);
  };

  useEffect(() => {
    if (webhook === null) {
      setHeaders(null);
      sendForAllActions(null);
      setActions(null);
      return;
    }
    setHeaders(Object.entries(webhook.headers));
    setSendForAllActions(webhook.send_for_all_actions);
    setActions(new Set(webhook.actions));
  }, [webhook]);

  if (webhook === null || headers === null || sendForAllActions === null) return <></>;
  return <Block name='webhook'>
    <Elem name='controls'>
      <Button onClick={onBack}>
        Back
      </Button>
    </Elem>
    <Elem name='content'>
      <Form
        action='updateWebhook'
        params={{ pk: webhook.id }}
        formData={webhook}
        prepareData={(data) => {
          return {
            ...data,
            'send_for_all_actions': sendForAllActions,
            'headers': Object.fromEntries(headers),
            'actions': Array.from(actions),
          };
        }}
        onSubmit={async (response) => {
          if (!response.error_message) {
            await fetchWebhooks();
          }
        }}
      >
        <Form.Row columnCount={1}>
          <Label text='URL' large></Label>
          <Input name="url" placeholder="URL" />
        </Form.Row>
        <Form.Row columnCount={1}>
          <div>
            <Toggle name="is_active" label="Is active" />
          </div>
        </Form.Row>
        <Form.Row columnCount={1}>
          <Label text="Headers" large />
          <div style={{ background: 'rgba(0, 0, 0, 0.06)', padding: '16px 0', borderRadius: '8px' }}>
            <div style={{ paddingLeft: '16px' }}>
              {
                headers.map(([headKey, headValue], index) => {
                  return <Form.Row key={index} columnCount={3} >
                    <Input skip placeholder="header" value={headKey} onChange={(e) => onHeaderChange('key', e, index)} />
                    <Input skip placeholder="value" value={headValue} onChange={(e) => onHeaderChange('value', e, index)} />
                    <div>
                      <Button type='button' icon={<LsCross />} onClick={() => onHeaderRemove(index)}></Button>
                    </div>
                  </Form.Row>;
                })
              }
              <Button disabled={headers.find(([k]) => k === '')} type='button' style={{ margin: '12px 0 0 0' }} onClick={onAddHeaderClick}>Add Header</Button>
            </div>
          </div>
        </Form.Row>
        <Form.Row columnCount={1}>

          <Label text="Payload" large />
          <div>
            <Toggle name="send_payload" label="Send payload"></Toggle>
          </div>

          <div>
            <Toggle skip checked={sendForAllActions} label="Send for all actions" onChange={(e) => { setSendForAllActions(e.target.checked); }} />
          </div>
        </Form.Row>
        {
          !sendForAllActions ?
            <Form.Row columnCount={1} >
              <Label text="Actions" large />
              <div style={{ background: 'rgba(0, 0, 0, 0.06)', padding: '8px 16px', borderRadius: '8px' }}>
                {Object.entries(webhooksInfo).map(([key, value]) => {
                  return <Form.Row key={key} columnCount={1}>
                    <div>
                      <Toggle skip name={key} type='checkbox' label={value.name} onChange={onActionChange} checked={actions.has(key)}></Toggle>
                    </div>
                  </Form.Row>;
                })}
              </div>
            </Form.Row>
            :
            null
        }
        <Form.Actions>
          <Button look="danger" type='button' onClick={async ()=>{
            await api.callApi('deleteWebhook', {params:{pk:webhook.id}});
            onBack();
            await fetchWebhooks();
          }}>Delete</Button>
          <Button>Save</Button>
        </Form.Actions>
      </Form>
    </Elem>
  </Block >;
};

export default WebhookDetail;