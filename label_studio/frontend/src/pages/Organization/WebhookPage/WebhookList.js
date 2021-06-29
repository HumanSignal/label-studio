import React, {} from 'react';
import { LsPlus } from '../../../assets/icons';
import { Button } from '../../../components';
import { Form, Label, Input } from '../../../components/Form';
import { modal } from '../../../components/Modal/Modal';
import { Elem, Block } from '../../../utils/bem';
import "./WebhookPage.styl";


const WebhookList = ({ onSelectActive, webhooks, fetchWebhooks }) => {
  const showNewWebhookModal = () => {
    const modalProps = {
      title: `New webhook`,
      style: { width: 760 },
      closeOnClickOutside: false,
      body: <Form
        action='createWebhook'
        onSubmit={async (response) => {
          if (!response.error_message) {
            await fetchWebhooks();
            onSelectActive(response.id);
            modalRef.close();
          }
        }}
      >
        <Form.Row columnCount={1}>
          <Label text='URL' large></Label>
          <Input name='url' placeholder='URL'></Input>
        </Form.Row>
        <Form.Actions>
          <Button>Create</Button>
        </Form.Actions>
      </Form>,
    };
    const modalRef = modal(modalProps);
  };

  if (webhooks === null) return <></>;
  return <Block name='webhook'>
    <Elem name='controls'>
      <Button icon={<LsPlus />} primary onClick={showNewWebhookModal}>
        Add Webhook
      </Button>
    </Elem>
    <Elem name='content'>
      <Block name='webhook-list'>
        {
          webhooks.map(
            (obj) => <Elem key={obj.id} name='item' onClick={() => onSelectActive(obj.id)}>
              <Elem tag='span' name='item-status' mod={{ active: obj.is_active }}>
              </Elem>
              <Elem name='item-url'>
                {obj.url}
              </Elem>
              <Elem name='item-type'>
                {obj.send_for_all}
              </Elem>
            </Elem>,
          )
        }
      </Block>
    </Elem>
  </Block>;
};


export default WebhookList;
