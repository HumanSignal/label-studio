import React from 'react';
import { Columns } from '../../../components/Columns/Columns';
import { Description } from '../../../components/Description/Description';
import { Block, cn } from '../../../utils/bem';
import { StorageSet } from './StorageSet';
import './StorageSettings.styl';
import { useTranslation } from "react-i18next";
import "../../../translations/i18n";

export const StorageSettings = () => {
  const { t } = useTranslation();

  const rootClass = cn("storage-settings");

  return (
    <Block name="storage-settings">
      <Description style={{marginTop: 0}}>
        {t("useCloudDatabaseStorage")}  
      </Description>

      <Columns count={2} gap="40px" size="320px" className={rootClass}>
        <StorageSet
          title={t("sourceCloudStorage")}
          buttonLabel={t("addSourceStorage")}
          rootClass={rootClass}
        />

        <StorageSet
          title={t("targetCloudStorage")}
          target="export"
          buttonLabel={t("addTargetStorage")}
          rootClass={rootClass}
        />
      </Columns>
    </Block>
  );
};

StorageSettings.title = "Cloud Storage";
StorageSettings.path = "/storage";
