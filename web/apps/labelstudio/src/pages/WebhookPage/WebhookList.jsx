import { IconCross, IconExternal, IconPencil, IconWebhook } from "@humansignal/icons";
import { Button, EmptyState, SimpleCard, Typography } from "@humansignal/ui";
import clsx from "clsx";
import { format } from "date-fns";
import { useCallback } from "react";
import { Toggle } from "../../components/Form";
import { useAPI } from "../../providers/ApiProvider";
import { WebhookDeleteModal } from "./WebhookDeleteModal";
import { ABILITY, useAuth } from "@humansignal/core/providers/AuthProvider";

const WebhookListItem = ({ webhook, onSelectActive, onActiveChange, onDelete, canChangeWebhooks }) => {
  return (
    <li
      className={clsx(
        "flex justify-between items-center p-2 text-base border border-neutral-border rounded-lg group",
        canChangeWebhooks && "hover:bg-neutral-surface",
      )}
    >
      <div>
        <div className="flex items-center">
          <div>
            <Toggle
              name={webhook.id}
              checked={webhook.is_active}
              onChange={onActiveChange}
              disabled={!canChangeWebhooks}
            />
          </div>
          <div
            className={clsx(
              "max-w-[370px] overflow-hidden text-ellipsis font-medium ml-2",
              canChangeWebhooks && "cursor-pointer",
            )}
            onClick={canChangeWebhooks ? () => onSelectActive(webhook.id) : undefined}
          >
            {webhook.url}
          </div>
        </div>
        <div className="text-neutral-content-subtler text-sm mt-1">
          Created {format(new Date(webhook.created_at), "dd MMM yyyy, HH:mm")}
        </div>
      </div>
      {canChangeWebhooks && (
        <div className="hidden group-hover:flex gap-2">
          <Button variant="primary" look="outlined" onClick={() => onSelectActive(webhook.id)} icon={<IconPencil />}>
            Edit
          </Button>
          <Button
            variant="negative"
            look="outlined"
            onClick={() =>
              WebhookDeleteModal({
                onDelete,
              })
            }
            icon={<IconCross />}
          >
            Delete
          </Button>
        </div>
      )}
    </li>
  );
};

const WebhookList = ({ onSelectActive, onAddWebhook, webhooks, fetchWebhooks }) => {
  const api = useAPI();
  const { permissions } = useAuth();
  const canChangeWebhooks = permissions.can(ABILITY.can_change_webhooks);

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
    <>
      <header className="mb-base">
        <Typography variant="headline" size="medium" className="mb-tight">
          Webhooks
        </Typography>
        {webhooks.length > 0 && (
          <Typography size="small" className="text-neutral-content-subtler">
            Setup integrations that subscribe to certain events using Webhooks. When an event is triggered, {"app name"}{" "}
            sends an HTTP POST request to the configured webhook URL.
          </Typography>
        )}
      </header>
      <div className="w-full">
        {webhooks.length === 0 ? (
          <SimpleCard title="" className="bg-primary-background border-primary-border-subtler p-base">
            <EmptyState
              size="medium"
              variant="primary"
              icon={<IconWebhook />}
              title="Add your first webhook"
              description="Setup integrations that subscribe to certain events using Webhooks. When an event is triggered, Label Studio sends an HTTP POST request to the configured webhook URL."
              actions={
                canChangeWebhooks ? (
                  <Button variant="primary" look="filled" onClick={onAddWebhook}>
                    Add Webhook
                  </Button>
                ) : (
                  <Typography variant="body" size="small">
                    Contact your administrator to create Webhooks
                  </Typography>
                )
              }
              footer={
                !window.APP_SETTINGS.whitelabel_is_active && (
                  <Typography variant="label" size="small" className="text-primary-link">
                    <a
                      href="https://docs.humansignal.com/guide/webhooks.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                      aria-label="Learn more about webhooks (opens in new window)"
                    >
                      Learn more
                      <IconExternal width={16} height={16} />
                    </a>
                  </Typography>
                )
              }
            />
          </SimpleCard>
        ) : (
          <ul className="space-y-4 mt-wide">
            {webhooks.map((obj) => (
              <WebhookListItem
                key={obj.id}
                webhook={obj}
                onSelectActive={onSelectActive}
                onActiveChange={onActiveChange}
                onDelete={async () => {
                  await api.callApi("deleteWebhook", {
                    params: { pk: obj.id },
                  });
                  await fetchWebhooks();
                }}
                canChangeWebhooks={canChangeWebhooks}
              />
            ))}
          </ul>
        )}
      </div>
      {webhooks.length > 0 && canChangeWebhooks && (
        <div className="flex justify-end w-full mt-base">
          <Button variant="primary" look="filled" onClick={onAddWebhook}>
            Add Webhook
          </Button>
        </div>
      )}
    </>
  );
};

export default WebhookList;
