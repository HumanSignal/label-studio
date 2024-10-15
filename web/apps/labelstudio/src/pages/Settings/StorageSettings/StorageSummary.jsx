import { format } from "date-fns/esm";
import { React } from "react";
import { Button } from "../../../components";
import { DescriptionList } from "../../../components/DescriptionList/DescriptionList";
import { Tooltip } from "../../../components/Tooltip/Tooltip";
import { modal } from "../../../components/Modal/Modal";
import { Oneof } from "../../../components/Oneof/Oneof";
import { getLastTraceback } from "../../../utils/helpers";

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
  const tasks_total_help = `${tasks_existed} tasks that have been found and already synced will not be added to the project again.\n${
    tasks_existed + last_sync_count
  } tasks have been added in total for this storage.`;
  const annotations_help = `${last_sync_count} annotations successfully saved during the last sync.`;
  const total_annotations_help =
    typeof storage.meta?.total_annotations !== "undefined"
      ? `${storage.meta.total_annotations} total annotations seen in the project at the sync moment.`
      : "";

  const handleButtonClick = () => {
    const msg =
      `Error logs for ${target === "export" ? "export " : ""}${storage.type} ` +
      `storage ${storage.id} in project ${storage.project} and job ${storage.last_sync_job}:\n\n` +
      `${getLastTraceback(storage.traceback)}\n\n` +
      `meta = ${JSON.stringify(storage.meta)}\n`;

    modal({
      title: "Storage error logs",
      body: (
        <>
          <pre style={{ background: "#eee", borderRadius: 5, padding: 10 }}>{msg}</pre>
          <Button
            size="compact"
            onClick={() => {
              navigator.clipboard.writeText(msg);
            }}
          >
            Copy
          </Button>
          {target === "export" ? (
            <a
              style={{ float: "right" }}
              target="_blank"
              href="https://labelstud.io/guide/storage.html#Target-storage-permissions"
              rel="noreferrer"
            >
              Check Target Storage documentation
            </a>
          ) : (
            <a
              style={{ float: "right" }}
              target="_blank"
              href="https://labelstud.io/guide/storage.html#Source-storage-permissions"
              rel="noreferrer"
            >
              Check Source Storage documentation
            </a>
          )}
        </>
      ),
      style: { width: "700px" },
      optimize: false,
      allowClose: true,
    });
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
            "Completed: sync job completed successfully",
          ].join("\n")}
        >
          {storageStatus === "Failed" ? (
            <span style={{ cursor: "pointer", borderBottom: "1px dashed gray" }} onClick={handleButtonClick}>
              Failed
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
