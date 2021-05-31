import { format } from 'date-fns/esm';
import React from 'react';
import { DescriptionList } from '../../../components/DescriptionList/DescriptionList';
import { Oneof } from '../../../components/Oneof/Oneof';

export const StorageSummary = ({storage, className, enableLastSync = false}) => {
  return (
    <div className={className}>
      <DescriptionList>
        <Oneof value={storage.type}>
          <SummaryS3 case="s3" storage={storage}/>
        </Oneof>
        {enableLastSync && (
          <DescriptionList.Item term="Last Sync">
            {storage.last_sync ? format(new Date(storage.last_sync), 'MMMM dd, yyyy ∙ HH:mm:ss') : "Never synced"}
          </DescriptionList.Item>
        )}
      </DescriptionList>
    </div>
  );
};

// February 10, 202117:47:01

const SummaryS3 = ({ storage }) => {
  return (
    <>
      <DescriptionList.Item term="Bucket">
        {storage.bucket}
      </DescriptionList.Item>
    </>
  );
};
