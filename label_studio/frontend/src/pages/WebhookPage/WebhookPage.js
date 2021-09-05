import React, { useState, useCallback, useEffect, useMemo } from 'react';

import { useAPI } from '../../providers/ApiProvider';
import "./WebhookPage.styl";


import WebhookList from './WebhookList';
import WebhookDetail from './WebhookDetail';
import { useProject } from '../../providers/ProjectProvider';
import { Block, Elem } from '../../utils/bem';
import { IconInfo } from '../../assets/icons';
import { useHistory } from 'react-router';
import { useTranslation } from "react-i18next";
import "../../translations/i18n";
import i18n from "i18next";

const Webhook = () => {
  const { t } = useTranslation();

  const [activeWebhook, setActiveWebhook] = useState(null);
  const [webhooks, setWebhooks] = useState(null);
  const [webhooksInfo, setWebhooksInfo] = useState(null);

  const history = useHistory();

  const api = useAPI();
  const { project } = useProject();

  const projectId = useMemo(()=>{
    if (history.location.pathname.startsWith('/projects')){
      if (Object.keys(project).length === 0) {
        return null;
      }else{
        return project.id;
      }
    }else{
      return undefined;
    }
  }, [project, history]);
  console.log(projectId, history.location.pathname);
  const fetchWebhooks = useCallback(async () => {
    if (projectId === null) {
      setWebhooks(null);
      return;
    }
    let params = {};
    if (projectId !== undefined){
      params['project'] = projectId;
    } else {
      params['project'] = null;
    }
    const webhooks = await api.callApi('webhooks', {
      params,
    });
    if (webhooks) setWebhooks(webhooks);
  }, [api, projectId]);

  const fetchWebhooksInfo = useCallback(async () => {
    if (projectId === null) {
      setWebhooksInfo(null);
      return;
    }
    let params = {};
    if (projectId !== undefined){
      params['organization-only'] = false;
    }

    const info = await api.callApi('webhooksInfo',
      {
        params,
      },
    );
    if (info) setWebhooksInfo(info);
  }, [api, projectId]);

  useEffect(() => {
    fetchWebhooks();
    fetchWebhooksInfo();
  }, [api, project, projectId]);

  if (webhooks === null || webhooksInfo === null || projectId === null) {
    return null;
  }
  let content = null;
  if (activeWebhook==='new') {
    content = <WebhookDetail
      onSelectActive={setActiveWebhook}
      onBack={() => setActiveWebhook(null)}
      webhook={null}
      fetchWebhooks={fetchWebhooks}
      webhooksInfo={webhooksInfo} />;  
  } else if (activeWebhook === null) {
    content = <WebhookList
      onSelectActive={setActiveWebhook}
      onAddWebhook={()=>{setActiveWebhook('new');}}
      fetchWebhooks={fetchWebhooks}
      webhooks={webhooks}       
    />;
  } else {
    content = <WebhookDetail
      onSelectActive={setActiveWebhook}
      onBack={() => setActiveWebhook(null)}
      webhook={webhooks[webhooks.findIndex((x) => x.id === activeWebhook)]}
      fetchWebhooks={fetchWebhooks}
      webhooksInfo={webhooksInfo} />;
  }
  return <Block name='webhook-wrap'>
    {content}
    <Elem name="footer">
      <Elem name='footer-icon'>
        <IconInfo width='28' height='28'/>
      </Elem>
      <Elem name='footer-text'>
        <p>
          {t("webhooksAllowExternal")}
        </p>
        <p>
          <a href="https://labelstud.io/guide/webhooks.html">{t("readMoreIn")}</a>.
        </p>
      </Elem>
    </Elem>
  </Block>;
};

export const WebhookPage = {
  title: i18n.t("webhooks"),
  path: "/webhooks",
  component: Webhook,
};
