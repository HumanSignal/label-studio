import { format } from 'date-fns/esm';
import { React } from 'react';
import { DescriptionList } from '../../../components/DescriptionList/DescriptionList';
import { modal } from '../../../components/Modal/Modal';
import { Button } from '../../../components';
import { Oneof } from '../../../components/Oneof/Oneof';
import { lastTwoLines } from '../../../utils/helpers';

export const StorageSummary = ({ target, storage, className, storageTypes = [] }) => {
  const storageStatus = storage.status.replace(/_/g, ' ').replace(/(^\w)/, match => match.toUpperCase());

  const handleButtonClick = () => {
    const msg = `Error logs for ${target==='export' ? 'export ': ''}${storage.type} ` +
            `storage ${storage.id} in project ${storage.project} and job ${storage.last_sync_job}:\n\n` +
            `${lastTwoLines(storage.traceback)}\n\n` +
            `meta = ${JSON.stringify(storage.meta)}\n`;

    modal({
      title: "Storage error logs",
      body: (
        <>
          <pre style={{ background: "#eee", borderRadius: 5, padding: 10 }}>{msg}</pre>
          <Button size="compact" onClick={() => { navigator.clipboard.writeText(msg); }}>Copy</Button>
          {(target === 'export' ? (
            <a  style={{ float: "right" }} target="_blank" href="https://docs.heartex.com/guide/storage.html#Target-storage-permissions">
              Check Target Storage documentation
            </a>
          ) : (
            <a style={{ float: "right" }} target="_blank" href="https://docs.heartex.com/guide/storage.html#Source-storage-permissions">
              Check Source Storage documentation
            </a>
          )
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
          help={'Initialized: storage was added, but never synced \n' +
                'Queued: sync job is in the queue, but not yet started \n'+
                'In progress: sync job is running \n' +
                'Failed: sync job stopped, some errors occurred \n' +
                'Completed: sync job completed successfully'}
        >
          {
            storageStatus === 'Failed' ? (
              <span
                style={{ cursor:"pointer", borderBottom: "1px dashed gray" }}
                onClick={handleButtonClick}>Failed</span>
            ) :
              storageStatus
          }
        </DescriptionList.Item>

        <DescriptionList.Item
          term={target === 'export' ? 'Annotations' : 'Tasks' }
          help={
            target === 'export' ?
              'Number of annotations successfully saved during the last sync':
              'Number of new tasks successfully added during the last sync.\n' +
              "Tasks that have already been synced won't be added to the project and included in this counter."
          }
        >
          {storage.last_sync_count ? storage.last_sync_count : "0"}
        </DescriptionList.Item>

        <DescriptionList.Item term="Last Sync">
          {storage.last_sync ? format(new Date(storage.last_sync), 'MMMM dd, yyyy ∙ HH:mm:ss') : "Not synced yet"}
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

const GSCStorage = ({storage}) => {
  return (
    <DescriptionList.Item term="Bucket">
      {storage.bucket}
    </DescriptionList.Item>
  );
};

const AzureStorage = ({storage}) => {
  return (
    <DescriptionList.Item term="Container">
      {storage.container}
    </DescriptionList.Item>
  );
};

const RedisStorage = ({storage}) => {
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

const LocalStorage = ({storage}) => {
  return (
    <DescriptionList.Item term="Path">
      {storage.path}
    </DescriptionList.Item>
  );
};
