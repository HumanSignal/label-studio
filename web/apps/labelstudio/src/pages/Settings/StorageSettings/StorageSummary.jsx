import { useState } from "react";
import { format } from "date-fns/esm";
import { Button, CodeBlock, Space, Tooltip, ModalWindow } from "@humansignal/ui";
import { IconFileCopy } from "@humansignal/icons";
import { DescriptionList } from "../../../components/DescriptionList/DescriptionList";
import { Oneof } from "../../../components/Oneof/Oneof";
import { getLastTraceback } from "../../../utils/helpers";
import { useCopyText } from "@humansignal/core";

// Component to handle copy functionality within the modal
const CopyButton = ({ msg }) => {
  const [copyText, copied] = useCopyText({ defaultText: msg });

  return (
    <Button variant="neutral" icon={<IconFileCopy />} onClick={() => copyText()} disabled={copied} className="w-[7rem]">
      {copied ? "Copied!" : "Copy"}
    </Button>
  );
};

export const StorageSummary = ({ target, storage, className, storageTypes = [] }) => {
  const storageStatus = storage.status.replace(/_/g, " ").replace(/(^\w)/, (match) => match.toUpperCase());
  const last_sync_count = storage.last_sync_count ? storage.last_sync_count : 0;

  const tasks_existed =
    typeof storage.meta?.tasks_existed !== "undefined" && storage.meta?.tasks_existed !== null
      ? storage.meta.tasks_existed
      : 0;
  const total_annotations =
    typeof storage.meta?.total_annotations !== "undefined" && storage.meta?.total_annotations !== null
      ? storage.meta.total_annotations
      : 0;

  // help text for tasks and annotations
  const tasks_added_help = `${last_sync_count} new tasks added during the last sync.`;
  const tasks_total_help = [
    `${tasks_existed} tasks that have been found and already synced will not be added to the project again.`,
    `${tasks_existed + last_sync_count} tasks have been added in total for this storage.`,
  ].join("\n");
  const annotations_help = `${last_sync_count} annotations successfully saved during the last sync.`;
  const total_annotations_help =
    typeof storage.meta?.total_annotations !== "undefined"
      ? `${storage.meta.total_annotations} total annotations seen in the project at the sync moment.`
      : "";

  const [errorLog, setErrorLog] = useState(null);

  const handleButtonClick = () => {
    const msg =
      `Error logs for ${target === "export" ? "export " : ""}${storage.type} ` +
      `storage ${storage.id} in project ${storage.project} and job ${storage.last_sync_job}:\n\n` +
      `${getLastTraceback(storage.traceback)}\n\n` +
      `meta = ${JSON.stringify(storage.meta)}\n`;

    setErrorLog(msg);
  };

  return (
    <div className={className}>
      <DescriptionList>
        <DescriptionList.Item term="Type">
          {(storageTypes ?? []).find((s) => s.name === storage.type)?.title ?? storage.type}
        </DescriptionList.Item>

        <Oneof value={storage.type}>
          <SummaryS3 case={["s3", "s3s"]} storage={storage} />
          <GSCStorage case="gcs" storage={storage} />
          <AzureStorage case="azure" storage={storage} />
          <RedisStorage case="redis" storage={storage} />
          <LocalStorage case="localfiles" storage={storage} />
        </Oneof>

        <DescriptionList.Item
          term="Status"
          help={[
            "Initialized: storage was added, but never synced; sufficient for starting URI link resolving",
            "Queued: sync job is in the queue, but not yet started",
            "In progress: sync job is running",
            "Failed: sync job stopped, some errors occurred",
            "Completed with errors: sync job completed but some tasks had validation errors",
            "Completed: sync job completed successfully",
          ].join("\n")}
        >
          {storageStatus === "Failed" || storageStatus === "Completed with errors" ? (
            <span
              className="cursor-pointer border-b border-dashed border-negative-border-subtle text-negative-content"
              onClick={handleButtonClick}
            >
              {storageStatus} (View Logs)
            </span>
          ) : (
            storageStatus
          )}
        </DescriptionList.Item>

        {target === "export" ? (
          <DescriptionList.Item term="Annotations" help={`${annotations_help}\n${total_annotations_help}`}>
            <Tooltip title={annotations_help}>
              <span>{last_sync_count}</span>
            </Tooltip>
            <Tooltip title={total_annotations_help}>
              <span> ({total_annotations} total)</span>
            </Tooltip>
          </DescriptionList.Item>
        ) : (
          <DescriptionList.Item term="Tasks" help={`${tasks_added_help}\n${tasks_total_help}`}>
            <Tooltip title={`${tasks_added_help}\n${tasks_total_help}`} style={{ whiteSpace: "pre-wrap" }}>
              <span>{last_sync_count + tasks_existed}</span>
            </Tooltip>
            <Tooltip title={tasks_added_help}>
              <span> ({last_sync_count} new)</span>
            </Tooltip>
          </DescriptionList.Item>
        )}

        <DescriptionList.Item term="Last Sync">
          {storage.last_sync ? format(new Date(storage.last_sync), "MMMM dd, yyyy ∙ HH:mm:ss") : "Not synced yet"}
        </DescriptionList.Item>
      </DescriptionList>
      <ModalWindow
        open={errorLog !== null}
        onOpenChange={(open) => !open && setErrorLog(null)}
        title="Storage Sync Error Log"
        size="medium"
        dataTestId="storage-sync-error-log-modal"
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            {!window.APP_SETTINGS?.whitelabel_is_active && (
              <div>
                <a
                  href="https://labelstud.io/guide/storage.html#Troubleshooting"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Learn more about cloud storage troubleshooting"
                >
                  See docs
                </a>{" "}
                for troubleshooting tips on cloud storage connections.
              </div>
            )}
            <Space>
              <CopyButton msg={errorLog ?? ""} />
              <Button variant="primary" className="w-[7rem]" onClick={() => setErrorLog(null)}>
                Close
              </Button>
            </Space>
          </div>
        }
      >
        <CodeBlock code={errorLog ?? ""} variant="negative" className="max-h-[50vh] overflow-y-auto" />
      </ModalWindow>
    </div>
  );
};

const SummaryS3 = ({ storage }) => {
  return <DescriptionList.Item term="Bucket">{storage.bucket}</DescriptionList.Item>;
};

const GSCStorage = ({ storage }) => {
  return <DescriptionList.Item term="Bucket">{storage.bucket}</DescriptionList.Item>;
};

const AzureStorage = ({ storage }) => {
  return <DescriptionList.Item term="Container">{storage.container}</DescriptionList.Item>;
};

const RedisStorage = ({ storage }) => {
  return (
    <>
      <DescriptionList.Item term="Path">{storage.path}</DescriptionList.Item>
      <DescriptionList.Item term="Host">
        {storage.host}
        {storage.port ? `:${storage.port}` : ""}
      </DescriptionList.Item>
    </>
  );
};

const LocalStorage = ({ storage }) => {
  return <DescriptionList.Item term="Path">{storage.path}</DescriptionList.Item>;
};
