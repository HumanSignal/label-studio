import React, { useCallback } from "react";
import { LsCross, LsPencil, LsPlus } from "../../assets/icons";
import { Button } from "../../components";
import { Form, Input, Label, Toggle } from "../../components/Form";
import { modal } from "../../components/Modal/Modal";
import { Block, Elem } from "../../utils/bem";
import "./WebhookPage.scss";
import { format } from "date-fns";
import { useAPI } from "../../providers/ApiProvider";
import { WebhookDeleteModal } from "./WebhookDeleteModal";
import { useProject } from "../../providers/ProjectProvider";

const WebhookList = ({ onSelectActive, onAddWebhook, webhooks, fetchWebhooks }) => {
  const api = useAPI();

  if (webhooks === null) return <></>;

  const onActiveChange = useCallback(async (event) => {
    const value = event.target.checked;

    await api.callApi("updateWebhook", {
      params: {
        pk: event.target.name,
      },
      body: {
        is_active: value,
      },
    });
    await fetchWebhooks();
  }, []);

  return (
    <Block name="webhook">
      <h1>Webhooks</h1>
      <Elem name="controls">
        <Button onClick={onAddWebhook}>Add Webhook</Button>
      </Elem>
      <Elem>
        {webhooks.length === 0 ? null : (
          <Block name="webhook-list">
            {webhooks.map((obj) => (
              <Elem key={obj.id} name="item">
                <Elem name="info-wrap">
                  <Elem name="url-wrap">
                    <Elem name="item-active">
                      <Toggle name={obj.id} checked={obj.is_active} onChange={onActiveChange} />
                    </Elem>
                    <Elem name="item-url" onClick={() => onSelectActive(obj.id)}>
                      {obj.url}
                    </Elem>
                  </Elem>
                  <Elem name="item-date">Created {format(new Date(obj.created_at), "dd MMM yyyy, HH:mm")}</Elem>
                </Elem>
                <Elem name="item-control">
                  <Button onClick={() => onSelectActive(obj.id)} icon={<LsPencil />}>
                    Edit
                  </Button>
                  <Button
                    onClick={() =>
                      WebhookDeleteModal({
                        onDelete: async () => {
                          await api.callApi("deleteWebhook", { params: { pk: obj.id } });
                          await fetchWebhooks();
                        },
                      })
                    }
                    look="danger"
                    icon={<LsCross />}
                  >
                    Delete
                  </Button>
                </Elem>
              </Elem>
            ))}
          </Block>
        )}
      </Elem>
    </Block>
  );
};

export default WebhookList;
