import React, { useEffect, useState } from "react";
import { Button } from "../../components";
import { Form, Input, Label, Toggle } from "../../components/Form";
import { Block, cn, Elem } from "../../utils/bem";
import { cloneDeep } from "lodash";
import { LsCross, LsPlus } from "../../assets/icons";
import { useAPI } from "../../providers/ApiProvider";
import "./WebhookPage.styl";
import { Space } from "../../components/Space/Space";
import { useProject } from "../../providers/ProjectProvider";
import { modal } from "../../components/Modal/Modal";
import { useModalControls } from "../../components/Modal/ModalPopup";
import { WebhookDeleteModal } from "./WebhookDeleteModal";
import { format } from "date-fns";

const WebhookDetail = ({ webhook, webhooksInfo, fetchWebhooks, onBack, onSelectActive }) => {
  // if webhook === null - create mod
  // else update
  const rootClass = cn("webhook-detail");

  const api = useAPI();
  const [headers, setHeaders] = useState(Object.entries(webhook?.headers || []));
  const [sendForAllActions, setSendForAllActions] = useState(webhook ? webhook.send_for_all_actions : true);
  const [actions, setActions] = useState(new Set(webhook?.actions));
  const [isActive, setIsActive] = useState(webhook ? webhook.is_active : true);
  const [sendPayload, setSendPayload] = useState(webhook ? webhook.send_payload : true);
  const { project } = useProject();
  const [projectId, setProjectId] = useState(project.id);

  useEffect(() => {
    if (Object.keys(project).length === 0) {
      setProjectId(null);
    } else {
      setProjectId(project.id);
    }
  }, [project]);

  const onAddHeaderClick = () => {
    setHeaders([...headers, ["", ""]]);
  };
  const onHeaderRemove = (index) => {
    const newHeaders = cloneDeep(headers);

    newHeaders.splice(index, 1);
    setHeaders(newHeaders);
  };
  const onHeaderChange = (aim, event, index) => {
    const newHeaders = cloneDeep(headers);

    if (aim === "key") {
      newHeaders[index][0] = event.target.value;
    }
    if (aim === "value") {
      newHeaders[index][1] = event.target.value;
    }
    setHeaders(newHeaders);
  };

  const onActionChange = (event) => {
    const newActions = new Set(actions);

    if (event.target.checked) {
      newActions.add(event.target.name);
    } else {
      newActions.delete(event.target.name);
    }
    setActions(newActions);
  };

  useEffect(() => {
    if (webhook === null) {
      setHeaders([]);
      setSendForAllActions(true);
      setActions(new Set());
      setIsActive(true);
      setSendPayload(true);
      return;
    }
    setHeaders(Object.entries(webhook.headers));
    setSendForAllActions(webhook.send_for_all_actions);
    setActions(new Set(webhook.actions));
    setIsActive(webhook.is_active);
    setSendPayload(webhook.send_payload);
  }, [webhook]);

  if (projectId === undefined) return <></>;
  return (
    <Block name="webhook">
      <Elem name="title">
        <>
          <Elem
            tag="span"
            name="title-base"
            onClick={() => {
              onSelectActive(null);
            }}
          >
            Webhooks
          </Elem>{" "}
          / {webhook === null ? "New Webhook" : "Edit Webhook"}
        </>
      </Elem>
      <Elem name="content">
        <Block name={"webhook-detail"}>
          <Form
            action={webhook === null ? "createWebhook" : "updateWebhook"}
            params={webhook === null ? {} : { pk: webhook.id }}
            formData={webhook}
            prepareData={(data) => {
              return {
                ...data,
                project: projectId,
                send_for_all_actions: sendForAllActions,
                headers: Object.fromEntries(headers.filter(([key]) => key !== "")),
                actions: Array.from(actions),
                is_active: isActive,
                send_payload: sendPayload,
              };
            }}
            onSubmit={async (response) => {
              if (!response.error_message) {
                await fetchWebhooks();
                onSelectActive(null);
              }
            }}
          >
            <Form.Row columnCount={1}>
              <Label text="Payload URL" large />
              <Space className={rootClass.elem("url-space")}>
                <Input name="url" className={rootClass.elem("url-input")} placeholder="URL" />
                <Space align="end" className={rootClass.elem("activator")}>
                  <span className={rootClass.elem("black-text")}>Is Active</span>
                  <Toggle
                    skip
                    checked={isActive}
                    onChange={(e) => {
                      setIsActive(e.target.checked);
                    }}
                  />
                </Space>
              </Space>
            </Form.Row>
            <Form.Row columnCount={1}>
              <div className={rootClass.elem("headers")}>
                <div className={rootClass.elem("headers-content")}>
                  <Space spread className={rootClass.elem("headers-control")}>
                    <Label text="Headers" large />
                    <Button
                      type="button"
                      onClick={onAddHeaderClick}
                      className={rootClass.elem("headers-add")}
                      icon={<LsPlus />}
                    />
                  </Space>
                  {headers.map(([headKey, headValue], index) => {
                    return (
                      <Space key={index} className={rootClass.elem("headers-row")} columnCount={3}>
                        <Input
                          className={rootClass.elem("headers-input")}
                          skip
                          placeholder="header"
                          value={headKey}
                          onChange={(e) => onHeaderChange("key", e, index)}
                        />
                        <Input
                          className={rootClass.elem("headers-input")}
                          skip
                          placeholder="value"
                          value={headValue}
                          onChange={(e) => onHeaderChange("value", e, index)}
                        />
                        <div>
                          <Button
                            className={rootClass.elem("headers-remove")}
                            type="button"
                            icon={<LsCross />}
                            onClick={() => onHeaderRemove(index)}
                          />
                        </div>
                      </Space>
                    );
                  })}
                </div>
              </div>
            </Form.Row>
            <Block name="webhook-payload">
              <Elem name="title">
                <Label text="Payload" large />
              </Elem>
              <Elem name="content">
                <Elem name="content-row">
                  <Toggle
                    skip
                    checked={sendPayload}
                    onChange={(e) => {
                      setSendPayload(e.target.checked);
                    }}
                    label="Send payload"
                  />
                </Elem>
                <Elem name="content-row">
                  <Toggle
                    skip
                    checked={sendForAllActions}
                    label="Send for all actions"
                    onChange={(e) => {
                      setSendForAllActions(e.target.checked);
                    }}
                  />
                </Elem>
                <div>
                  {!sendForAllActions ? (
                    <Elem name="content-row-actions">
                      <Elem tag="h4" name="title" mod={{ black: true }}>
                        Send Payload for
                      </Elem>
                      <Elem name="actions">
                        {Object.entries(webhooksInfo).map(([key, value]) => {
                          return (
                            <Form.Row key={key} columnCount={1}>
                              <div>
                                <Toggle
                                  skip
                                  name={key}
                                  type="checkbox"
                                  label={value.name}
                                  onChange={onActionChange}
                                  checked={actions.has(key)}
                                />
                              </div>
                            </Form.Row>
                          );
                        })}
                      </Elem>
                    </Elem>
                  ) : null}
                </div>
              </Elem>
            </Block>
            <Elem name="controls">
              {webhook === null ? null : (
                <Button
                  look="danger"
                  type="button"
                  className={rootClass.elem("delete-button")}
                  onClick={() =>
                    WebhookDeleteModal({
                      onDelete: async () => {
                        await api.callApi("deleteWebhook", { params: { pk: webhook.id } });
                        onBack();
                        await fetchWebhooks();
                      },
                    })
                  }
                >
                  Delete Webhook
                </Button>
              )}
              <div className={rootClass.elem("status")}>
                <Form.Indicator />
              </div>
              <Button type="button" className={rootClass.elem("cancel-button")} onClick={onBack}>
                Cancel
              </Button>
              <Button primary className={rootClass.elem("save-button")}>
                {webhook === null ? "Add Webhook" : "Save"}
              </Button>
            </Elem>
          </Form>
        </Block>
      </Elem>
    </Block>
  );
};

export default WebhookDetail;
