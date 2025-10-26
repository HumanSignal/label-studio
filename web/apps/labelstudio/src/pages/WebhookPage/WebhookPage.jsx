import { useCallback, useEffect, useMemo, useState } from "react";

import { useAPI } from "../../providers/ApiProvider";

import { useHistory } from "react-router";
import { useProject } from "../../providers/ProjectProvider";
import WebhookDetail from "./WebhookDetail";
import WebhookList from "./WebhookList";
import { createTitleFromSegments, useUpdatePageTitle } from "@humansignal/core";

const Webhook = () => {
  const [activeWebhook, setActiveWebhook] = useState(null);
  const [webhooks, setWebhooks] = useState(null);
  const [webhooksInfo, setWebhooksInfo] = useState(null);

  const history = useHistory();

  const api = useAPI();
  const { project } = useProject();

  useUpdatePageTitle(createTitleFromSegments([project?.title, "Webhooks Settings"]));

  const projectId = useMemo(() => {
    if (history.location.pathname.startsWith("/projects")) {
      if (Object.keys(project).length === 0) {
        return null;
      }
      return project.id;
    }
    return undefined;
  }, [project, history]);

  const fetchWebhooks = useCallback(async () => {
    if (projectId === null) {
      setWebhooks(null);
      return;
    }
    const params = {};

    if (projectId !== undefined) {
      params.project = projectId;
    } else {
      params.project = null;
    }
    const webhooks = await api.callApi("webhooks", {
      params,
    });

    if (webhooks) setWebhooks(webhooks);
  }, [projectId]);

  const fetchWebhooksInfo = useCallback(async () => {
    if (projectId === null) {
      setWebhooksInfo(null);
      return;
    }
    const params = {};

    if (projectId !== undefined) {
      params["organization-only"] = false;
    }

    const info = await api.callApi("webhooksInfo", {
      params,
    });

    if (info) setWebhooksInfo(info);
  }, [projectId]);

  useEffect(() => {
    fetchWebhooks();
    fetchWebhooksInfo();
  }, [project, projectId]);

  if (webhooks === null || webhooksInfo === null || projectId === null) {
    return null;
  }
  let content = null;

  if (activeWebhook === "new") {
    content = (
      <WebhookDetail
        onSelectActive={setActiveWebhook}
        onBack={() => setActiveWebhook(null)}
        webhook={null}
        fetchWebhooks={fetchWebhooks}
        webhooksInfo={webhooksInfo}
      />
    );
  } else if (activeWebhook === null) {
    content = (
      <WebhookList
        onSelectActive={setActiveWebhook}
        onAddWebhook={() => {
          setActiveWebhook("new");
        }}
        fetchWebhooks={fetchWebhooks}
        webhooks={webhooks}
      />
    );
  } else {
    content = (
      <WebhookDetail
        onSelectActive={setActiveWebhook}
        onBack={() => setActiveWebhook(null)}
        webhook={webhooks[webhooks.findIndex((x) => x.id === activeWebhook)]}
        fetchWebhooks={fetchWebhooks}
        webhooksInfo={webhooksInfo}
      />
    );
  }
  return <section className="w-[42rem]">{content}</section>;
};

export const WebhookPage = {
  title: "Webhooks",
  path: "/webhooks",
  component: Webhook,
};
