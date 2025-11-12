import { IconCross, IconPlus } from "@humansignal/icons";
import { Button, Typography } from "@humansignal/ui";
import cloneDeep from "lodash/cloneDeep";
import { useEffect, useState } from "react";
import { Form, Input, Label, Toggle } from "../../components/Form";
import { useAPI } from "../../providers/ApiProvider";
import { cn } from "../../utils/bem";
import { useProject } from "../../providers/ProjectProvider";
import { WebhookDeleteModal } from "./WebhookDeleteModal";

const WebhookForm = ({
  webhook,
  webhooksInfo,
  fetchWebhooks,
  onSelectActive,
  onBack,
  projectId,
  headers,
  onAddHeaderClick,
  onHeaderRemove,
  onHeaderChange,
  sendForAllActions,
  setSendForAllActions,
  actions,
  onActionChange,
  isActive,
  setIsActive,
  sendPayload,
  setSendPayload,
  api,
  rootClass,
}) => {
  return (
    <Form
      action={webhook === null ? "createWebhook" : "updateWebhook"}
      params={webhook === null ? {} : { pk: webhook.id }}
      formData={webhook}
      prepareData={(data) => {
        return {
          ...data,
          project: projectId,
          send_for_all_actions: sendForAllActions,
          headers: Object.fromEntries(
            headers.filter((header) => header.key !== "").map((header) => [header.key, header.value]),
          ),
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
        <div className="grid grid-cols-[1fr_135px] gap-tight">
          <Input name="url" className="self-stretch w-auto" placeholder="URL" />
          <div className="grid grid-flow-col auto-cols-max items-center justify-end gap-tight self-center">
            <span className="text-neutral-content">Is Active</span>
            <Toggle
              skip
              checked={isActive}
              onChange={(e) => {
                setIsActive(e.target.checked);
              }}
            />
          </div>
        </div>
      </Form.Row>
      <Form.Row columnCount={1}>
        <div className="border border-neutral-border p-4 rounded-lg mb-4">
          <div className="flex flex-col gap-tight">
            <div className="flex items-center justify-between">
              <Label text="Headers" large />
              <Button
                type="button"
                variant="primary"
                look="string"
                onClick={onAddHeaderClick}
                className="!p-0 [&_span]:!text-[var(--grape_500)]"
                leading={<IconPlus />}
                tooltip="Add Header"
              />
            </div>
            {headers.map((header, index) => {
              return (
                <div key={header.id} className="grid grid-cols-[1fr_1fr_40px] gap-tight">
                  <Input
                    skip
                    placeholder="header"
                    value={header.key}
                    onChange={(e) => onHeaderChange("key", e, index)}
                  />
                  <Input
                    skip
                    placeholder="value"
                    value={header.value}
                    onChange={(e) => onHeaderChange("value", e, index)}
                  />
                  <div>
                    <Button
                      variant="negative"
                      look="string"
                      className="h-8 w-8 !p-0"
                      type="button"
                      icon={<IconCross />}
                      onClick={() => onHeaderRemove(index)}
                      tooltip="Remove Header"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Form.Row>
      <div className="border border-neutral-border p-4 rounded-lg mb-4">
        <div>
          <Label text="Payload" large />
        </div>
        <div>
          <div className="my-2">
            <Toggle
              skip
              checked={sendPayload}
              onChange={(e) => {
                setSendPayload(e.target.checked);
              }}
              label="Send payload"
            />
          </div>
          <div className="my-2">
            <Toggle
              skip
              checked={sendForAllActions}
              label="Send for all actions"
              onChange={(e) => {
                setSendForAllActions(e.target.checked);
              }}
            />
          </div>
          <div>
            {!sendForAllActions ? (
              <div>
                <h4 className="text-neutral-content">Send Payload for</h4>
                <div>
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
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-base">
        {webhook !== null && (
          <Button
            type="button"
            variant="negative"
            look="outlined"
            aria-label="Delete webhook"
            onClick={() =>
              WebhookDeleteModal({
                onDelete: async () => {
                  await api.callApi("deleteWebhook", {
                    params: { pk: webhook.id },
                  });
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
        <Button
          variant="neutral"
          look="outlined"
          type="button"
          className="ml-auto"
          onClick={onBack}
          aria-label="Cancel webhook edit"
        >
          Cancel
        </Button>
        <Button
          className={rootClass.elem("save-button")}
          aria-label={webhook === null ? "Add Webhook" : "Save Changes"}
        >
          {webhook === null ? "Add Webhook" : "Save Changes"}
        </Button>
      </div>
    </Form>
  );
};

const WebhookDetail = ({ webhook, webhooksInfo, fetchWebhooks, onBack, onSelectActive }) => {
  const rootClass = cn("webhook-detail");

  const api = useAPI();
  const [headers, setHeaders] = useState(
    webhook?.headers
      ? Object.entries(webhook.headers).map(([key, value], index) => ({
          id: `header-${Date.now()}-${index}`,
          key,
          value,
        }))
      : [],
  );
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
    setHeaders([
      ...headers,
      {
        id: `header-${Date.now()}-${Math.random()}`,
        key: "",
        value: "",
      },
    ]);
  };
  const onHeaderRemove = (index) => {
    const newHeaders = cloneDeep(headers);

    newHeaders.splice(index, 1);
    setHeaders(newHeaders);
  };
  const onHeaderChange = (aim, event, index) => {
    const newHeaders = cloneDeep(headers);

    if (aim === "key") {
      newHeaders[index].key = event.target.value;
    }
    if (aim === "value") {
      newHeaders[index].value = event.target.value;
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
    setHeaders(
      Object.entries(webhook.headers).map(([key, value], index) => ({
        id: `header-${Date.now()}-${index}`,
        key,
        value,
      })),
    );
    setSendForAllActions(webhook.send_for_all_actions);
    setActions(new Set(webhook.actions));
    setIsActive(webhook.is_active);
    setSendPayload(webhook.send_payload);
  }, [webhook]);

  if (projectId === undefined) return <></>;

  return (
    <>
      <header className="page-header flex items-center gap-2">
        <Typography
          as="a"
          variant="headline"
          size="medium"
          onClick={() => onSelectActive(null)}
          className="cursor-pointer text-neutral-content-subtler hover:text-neutral-content-subtle"
        >
          Webhooks
        </Typography>
        <Typography variant="headline" size="medium" className="text-neutral-content-subtler">
          / {webhook === null ? "New Webhook" : "Edit Webhook"}
        </Typography>
      </header>
      <div className="mt-base">
        <WebhookForm
          webhook={webhook}
          webhooksInfo={webhooksInfo}
          fetchWebhooks={fetchWebhooks}
          onSelectActive={onSelectActive}
          onBack={onBack}
          projectId={projectId}
          headers={headers}
          onAddHeaderClick={onAddHeaderClick}
          onHeaderRemove={onHeaderRemove}
          onHeaderChange={onHeaderChange}
          sendForAllActions={sendForAllActions}
          setSendForAllActions={setSendForAllActions}
          actions={actions}
          onActionChange={onActionChange}
          isActive={isActive}
          setIsActive={setIsActive}
          sendPayload={sendPayload}
          setSendPayload={setSendPayload}
          api={api}
          rootClass={rootClass}
        />
      </div>
    </>
  );
};

export default WebhookDetail;
