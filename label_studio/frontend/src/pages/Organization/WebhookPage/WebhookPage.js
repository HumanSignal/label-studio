import React, { useState, useCallback, useEffect } from 'react';

import { useAPI } from '../../../providers/ApiProvider';
import "./WebhookPage.styl";


import WebhookList from './WebhookList';
import WebhookDetail from './WebhookDetail';

const Webhook = () => {
  const [activeWebhook, setActiveWebhook] = useState(null);
  const [webhooks, setWebhooks] = useState(null);
  const [webhooksInfo, setWebhooksInfo] = useState(null);
  const api = useAPI();

  const fetchWebhooks = useCallback(async () => {
    const webhooks = await api.callApi('webhooks');
    if (webhooks) setWebhooks(webhooks);
  }, [api]);

  const fetchWebhooksInfo = useCallback(async () => {
    const info = await api.callApi('webhooksInfo');
    if (info) setWebhooksInfo(info);
  }, [api]);

  useEffect(() => {
    fetchWebhooks();
    fetchWebhooksInfo();
  }, []);

  if (webhooks === null || webhooksInfo === null) {
    return null;
  }
  if (activeWebhook === null) {
    return <WebhookList
      onSelectActive={setActiveWebhook}
      webhooks={webhooks} 
      fetchWebhooks={fetchWebhooks} />;
  } else {
    return <WebhookDetail
      onBack={() => setActiveWebhook(null)}
      webhook={webhooks[webhooks.findIndex((x) => x.id === activeWebhook)]}
      fetchWebhooks={fetchWebhooks}
      webhooksInfo={webhooksInfo} />;
  }
};

export const WebhookPage = {
  title: "Webhooks",
  path: "/webhooks",
  component: Webhook,
};