import React, { useCallback } from 'react';
import { LsCross, LsPencil } from '../../assets/icons';
import { Button } from '../../components';
import { Toggle } from '../../components/Form';
import { Elem, Block } from '../../utils/bem';
import "./WebhookPage.styl";
import { format } from 'date-fns';
import { useAPI } from '../../providers/ApiProvider';
import { WebhookDeleteModal } from './WebhookDeleteModal';
import { useTranslation } from "react-i18next";
import "../../translations/i18n";


const WebhookList = ({ onSelectActive, onAddWebhook, webhooks, fetchWebhooks }) => {
  const { t } = useTranslation();

  const api = useAPI();

  if (webhooks === null) return <></>;

  const onActiveChange = useCallback( async (event) => {
    let value = event.target.checked;
    await api.callApi('updateWebhook', {
      params: {
        pk: event.target.name,
      },
      body: {
        is_active: value,
      },
    });
    await fetchWebhooks();
  }, [api]);

  return <Block name='webhook'>
    <Elem name='controls'>
      <Button onClick={onAddWebhook}>
        {t("addWebhook")}
      </Button>
    </Elem>
    <Elem>
      {webhooks.length === 0? 
        null
        :
        <Block name='webhook-list'>
          {
            webhooks.map(
              (obj) => <Elem key={obj.id} name='item'>
                <Elem name='item-active'>
                  <Toggle
                    name={obj.id}
                    checked={obj.is_active}
                    onChange={onActiveChange} 
                  />
                </Elem>
                <Elem name='item-url' onClick={() => onSelectActive(obj.id)}>
                  {obj.url}
                </Elem>
                <Elem name='item-date'>
                  Created {format(new Date(obj.created_at), 'dd MMM yyyy, HH:mm')}
                </Elem>
                <Elem name='item-control'>
                  <Button
                    onClick={() => onSelectActive(obj.id)}
                    icon={<LsPencil />}
                  >{t("edit")}</Button>
                  <Button
                    onClick={()=> WebhookDeleteModal({ 
                      onDelete: async ()=>{
                        await api.callApi('deleteWebhook', {params:{pk:obj.id}});
                        await fetchWebhooks();
                      },
                    })}
                    look='danger'
                    icon={<LsCross />}
                  >{t("delete")}</Button>
                </Elem>
              </Elem>,
            )
          }
        </Block>}
    </Elem>
  </Block>;
};


export default WebhookList;
