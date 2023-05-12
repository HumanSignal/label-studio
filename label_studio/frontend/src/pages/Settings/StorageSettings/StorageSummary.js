import { format } from 'date-fns/esm';
import { React } from 'react';
import { Button } from '../../../components';
import { DescriptionList } from '../../../components/DescriptionList/DescriptionList';
import { Tooltip } from '../../../components/Tooltip/Tooltip';
import { modal } from '../../../components/Modal/Modal';
import { Oneof } from '../../../components/Oneof/Oneof';
import { getLastTraceback } from '../../../utils/helpers';

export const StorageSummary = ({ target, storage, className, storageTypes = [] }) => {
  const storageStatus = storage.status.replace(/_/g, ' ').replace(/(^\w)/, match => match.toUpperCase());
  const last_sync_count = storage.last_sync_count ? storage.last_sync_count : '0';

  const total_annotations_text = typeof storage.meta?.total_annotations !== 'undefined'
    ? `There were ${storage.meta.total_annotations} total annotations in the project at the sync moment.`
    : '';
  const tasks_existed = typeof storage.meta?.tasks_existed !== 'undefined'
    ? `(${storage.meta.tasks_existed}) `
    : '';
  const fraction_text = target === 'export'
    ? (typeof storage.meta?.total_annotations !== 'undefined' ? storage.meta.total_annotations : '')
    : (typeof storage.meta?.tasks_existed !== 'undefined' ? storage.meta.tasks_existed : '');

  // help text for tasks and annotations
  const tasks_help =
    'Number of annotations (' + last_sync_count + ') ' + 'successfully saved during the last sync.';
  const tasks_existed_help =
    "Tasks that have already been synced " + tasks_existed + "won't be added to the project.";
  const annotations_help =
    'Number of new tasks (' + last_sync_count + ') successfully added during the last sync.';
  const items_help = target === 'export'
    ? annotations_help + '\n' + total_annotations_text
    : tasks_help + '\n' + tasks_existed_help;

  const handleButtonClick = () => {
    const msg = `Error logs for ${target === 'export' ? 'export ' : ''}${storage.type} ` +
      `storage ${storage.id} in project ${storage.project} and job ${storage.last_sync_job}:\n\n` +
      `${getLastTraceback(storage.traceback)}\n\n` +
      `meta = ${JSON.stringify(storage.meta)}\n`;

    modal({
      title: "Storage error logs",
      body: (
        <>
          <pre style={{ background: "#eee", borderRadius: 5, padding: 10 }}>{msg}</pre>
          <Button size="compact" onClick={() => {
            navigator.clipboard.writeText(msg);
          }}>Copy</Button>
          {(target === 'export' ? (
            <a style={{ float: "right" }} target="_blank"
               href="https://labelstud.io/guide/storage.html#Target-storage-permissions">
              Check Target Storage documentation
            </a>
          ) : (
            <a style={{ float: "right" }} target="_blank"
               href="https://labelstud.io/guide/storage.html#Source-storage-permissions">
              Check Source Storage documentation
            </a>
          ))}
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
          {(storageTypes ?? []).find(s => s.name === storage.type)?.title ?? storage.type}
        </DescriptionList.Item>

        <Oneof value={storage.type}>
          <SummaryS3 case={["s3", "s3s"]} storage={storage}/>
          <GSCStorage case="gcs" storage={storage}/>
          <AzureStorage case="azure" storage={storage}/>
          <RedisStorage case="redis" storage={storage}/>
          <LocalStorage case="localfiles" storage={storage}/>
        </Oneof>

        <DescriptionList.Item
          term="Status"
          help={[
            'Initialized: storage was added, but never synced; sufficient for starting URI link resolving',
            'Queued: sync job is in the queue, but not yet started',
            'In progress: sync job is running',
            'Failed: sync job stopped, some errors occurred',
            'Completed: sync job completed successfully',
          ].join('\n')}
        >
          {
            storageStatus === 'Failed' ? (
              <span
                style={{cursor: "pointer", borderBottom: "1px dashed gray"}}
                onClick={handleButtonClick}
              >
                Failed
              </span>
            ) : storageStatus
          }
        </DescriptionList.Item>

        <DescriptionList.Item
          term={target === 'export' ? 'Annotations' : 'Tasks'}
          help={items_help}
        >
          <Tooltip title={target === 'export' ? annotations_help : tasks_help}>
            <span>{last_sync_count}</span>
          </Tooltip>
          {fraction_text !== '' && (
            <>
              { target === 'export' ? ' / ' : ' + '}
              <Tooltip title={target === 'export' ? total_annotations_text : tasks_existed_help}>
                <span>{fraction_text}</span>
              </Tooltip>
            </>
          )}
        </DescriptionList.Item>

        <DescriptionList.Item term="Last Sync">
          {storage.last_sync
            ? format(new Date(storage.last_sync), 'MMMM dd, yyyy ∙ HH:mm:ss')
            : "Not synced yet"}
        </DescriptionList.Item>
      </DescriptionList>
    </div>
  );
};

const SummaryS3 = ({ storage }) => {
  return (
    <DescriptionList.Item term="Bucket">
      {storage.bucket}
    </DescriptionList.Item>
  );
};

const GSCStorage = ({ storage }) => {
  return (
    <DescriptionList.Item term="Bucket">
      {storage.bucket}
    </DescriptionList.Item>
  );
};

const AzureStorage = ({ storage }) => {
  return (
    <DescriptionList.Item term="Container">
      {storage.container}
    </DescriptionList.Item>
  );
};

const RedisStorage = ({ storage }) => {
  return (
    <>
      <DescriptionList.Item term="Path">
        {storage.path}
      </DescriptionList.Item>
      <DescriptionList.Item term="Host">
        {storage.host}{storage.port ? `:${storage.post}` : ''}
      </DescriptionList.Item>
    </>
  );
};

const LocalStorage = ({ storage }) => {
  return (
    <DescriptionList.Item term="Path">
      {storage.path}
    </DescriptionList.Item>
  );
};
