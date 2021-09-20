import { format } from 'date-fns/esm';
import React from 'react';
import { DescriptionList } from '../../../components/DescriptionList/DescriptionList';
import { Oneof } from '../../../components/Oneof/Oneof';

export const StorageSummary = ({storage, className, storageTypes = []}) => {
  return (
    <div className={className}>
      <DescriptionList>
        <DescriptionList.Item term="Type">
          {storageTypes.find(s => s.name === storage.type)?.title ?? storage.type}
        </DescriptionList.Item>
        <Oneof value={storage.type}>
          <SummaryS3 case="s3" storage={storage}/>
          <GSCStorage case="gcs" storage={storage}/>
          <AzureStorage case="azure" storage={storage}/>
          <RedisStorage case="redis" storage={storage}/>
          <LocalStorage case="localfiles" storage={storage}/>
        </Oneof>
        <DescriptionList.Item term="Last Sync">
          {storage.last_sync ? format(new Date(storage.last_sync), 'MMMM dd, yyyy ∙ HH:mm:ss') : "Never synced"}
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
