import chroma from 'chroma-js';
import { observer } from 'mobx-react';
import { FC, useMemo, useState } from 'react';
import { IconLink, IconPlusAlt, IconTrash, IconWarning } from '../../../assets/icons';
import { IconEyeClosed, IconEyeOpened } from '../../../assets/icons/timeline';
import { Button, ButtonProps } from '../../../common/Button/Button';
import { Block, Elem } from '../../../utils/bem';
import { NodeIcon } from '../../Node/Node';
import { LockButton } from '../Components/LockButton';
import { RegionLabels } from './RegionLabels';

interface RegionItemProps {
  region: any;
  withActions?: boolean;
  compact?: boolean;
  withIds?: boolean;
  mainDetails?: FC<{region: any}>;
  metaDetails?: FC<{region: any, editMode?: boolean, cancelEditMode?: () => void}>;
}

export const RegionItem: FC<RegionItemProps> = observer(({
  region,
  compact = false,
  withActions = true,
  withIds = true,
  mainDetails: MainDetails,
  metaDetails: MetaDetails,
}) => {
  const { annotation } = region;
  const { selectedRegions: nodes } = annotation;
  const [editMode, setEditMode] = useState(false);

  const hasEditableRegions = useMemo(() => {
    return !!nodes.find((node: any) => !node.isReadOnly() && !node.classification);
  }, [nodes]);

  const color = useMemo(() => {
    const bgColor = region.background ?? region.getOneColor() ?? '#666';

    return chroma(bgColor).alpha(1);
  }, [region.background, region.style]);

  return (
    <Block name="detailed-region" mod={{ compact }}>
      <Elem name="head" style={{ color: color.css() }}>
        <Elem name="title">
          <Elem name="icon"><NodeIcon node={region}/></Elem>
          <RegionLabels region={region} />
        </Elem>
        {withIds && <span>{region.cleanId}</span>}
      </Elem>
      {MainDetails && <Elem name="content"><MainDetails region={region}/></Elem>}
      {region?.isDrawing && (
        <Elem name="warning">
          <IconWarning />
          <Elem name="warning-text">Incomplete {region.type.replace('region', '')}</Elem>
        </Elem>
      )}
      {withActions && (
        <RegionAction
          region={region}
          editMode={editMode}
          annotation={annotation}
          hasEditableRegions={hasEditableRegions}
          onEditModeChange={setEditMode}
        />
      )}
      {MetaDetails && (
        <Elem name="content">
          <MetaDetails
            region={region}
            editMode={editMode}
            enterEditMode={() => setEditMode(true)}
            cancelEditMode={() => setEditMode(false)}
          />
        </Elem>
      )}
    </Block>
  );
});

const RegionAction: FC<any> = observer(({
  region,
  annotation,
  editMode,
  onEditModeChange,
}) => {
  const entityButtons: JSX.Element[] = [];

  entityButtons.push((
    <RegionActionButton
      key="relation"
      icon={<IconLink/>}
      primary={annotation.relationMode}
      onClick={(_e: any, hotkey?: any) => {
        // If this is triggered by a hotkey, defer to the global bound handler for relations to avoid contention.
        if (hotkey) return;
        if (annotation.relationMode) {
          annotation.stopRelationMode();
        } else {
          annotation.startRelationMode(region);
        }
      }}
      hotkey="region:relation"
    />
  ));

  entityButtons.push((
    <RegionActionButton
      key="meta"
      icon={<IconPlusAlt/>}
      primary={editMode}
      onClick={() => onEditModeChange(!editMode)}
      hotkey="region:meta"
      aria-label="Edit region's meta"
    />
  ));

  return (
    <Block name="region-actions">
      <Elem name="group" mod={{ align: 'left' }}>
        {!region.isReadOnly() && entityButtons}
      </Elem>
      <Elem name="group" mod={{ align: 'right' }}>
        <LockButton
          item={region}
          annotation={region?.annotation}
          hovered={true}
          locked={region?.locked}
          onClick={() => region.setLocked(!region.locked)}
          hotkey="region:lock"
          look='alt'
          style={{ width: 36, height: 32 }}
        />
        <RegionActionButton
          icon={region.hidden ? <IconEyeClosed/> : <IconEyeOpened/>}
          onClick={region.toggleHidden}
        />
        <RegionActionButton
          danger
          disabled={region.isReadOnly()}
          icon={<IconTrash/>}
          onClick={() => annotation.deleteRegion(region)}
        />
      </Elem>
    </Block>
  );
});

const RegionActionButton: FC<ButtonProps> = ({ children, ...props }) => {
  return (
    <Button {...props} look="alt" style={{ padding: 0 }}>
      {children}
    </Button>
  );
};
