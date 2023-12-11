import { observer } from 'mobx-react';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Block, Elem } from '../../../utils/bem';
import { PanelBase, PanelProps } from '../PanelBase';
import { OutlinerTree } from './OutlinerTree';
import { ViewControls } from './ViewControls';
import './OutlinerPanel.styl';
import { IconInfo } from '../../../assets/icons/outliner';
import { FF_LSDV_4992, FF_OUTLINER_OPTIM, isFF } from '../../../utils/feature-flags';

interface OutlinerPanelProps extends PanelProps {
  regions: any;
}

interface OutlinerTreeComponentProps {
  regions: any;
}

const OutlinerFFClasses: string[] = [];

if (isFF(FF_LSDV_4992)) {
  OutlinerFFClasses.push('ff_hide_all_regions');
}
if (isFF(FF_OUTLINER_OPTIM)) {
  OutlinerFFClasses.push('ff_outliner_optim');
}

const OutlinerPanelComponent: FC<OutlinerPanelProps> = ({ regions, ...props }) => {
  const [group, setGroup] = useState();
  const onOrderingChange = useCallback((value) => {
    regions.setSort(value);
  }, [regions]);

  const onGroupingChange = useCallback((value) => {
    regions.setGrouping(value);
    setGroup(value);
  }, [regions]);

  const onFilterChange = useCallback((value) => {
    regions.setFilteredRegions(value);
  }, [regions]);

  useEffect(() => {
    setGroup(regions.group);
  }, []);

  regions.setGrouping(group);

  return (
    <PanelBase {...props} name="outliner" mix={OutlinerFFClasses} title="Outliner">
      <ViewControls
        ordering={regions.sort}
        regions={regions}
        orderingDirection={regions.sortOrder}
        onOrderingChange={onOrderingChange}
        onGroupingChange={onGroupingChange}
        onFilterChange={onFilterChange}
      />
      <OutlinerTreeComponent regions={regions} />
    </PanelBase>
  );
};

const OutlinerStandAlone: FC<OutlinerPanelProps> = ({ regions }) => {
  const onOrderingChange = useCallback((value) => {
    regions.setSort(value);
  }, [regions]);

  const onGroupingChange = useCallback((value) => {
    regions.setGrouping(value);
  }, [regions]);

  const onFilterChange = useCallback((value) => {
    regions.setFilteredRegions(value);
  }, [regions]);

  return (
    <Block name="outliner" mix={OutlinerFFClasses}>
      <ViewControls
        ordering={regions.sort}
        regions={regions}
        orderingDirection={regions.sortOrder}
        onOrderingChange={onOrderingChange}
        onGroupingChange={onGroupingChange}
        onFilterChange={onFilterChange}
      />
      <OutlinerTreeComponent regions={regions} />
    </Block>
  );
};

const OutlinerTreeComponent: FC<OutlinerTreeComponentProps> = observer(({ regions }) => {
  const allRegionsHidden = regions?.regions?.length > 0 && regions?.filter?.length === 0;

  const hiddenRegions = useMemo(() => {
    if (!regions?.regions?.length || !regions.filter?.length) return 0;

    return regions?.regions?.length - regions?.filter?.length;
  }, [regions?.regions?.length, regions?.filter?.length]);

  return (
    <>
      {allRegionsHidden ? (
        <Block name="filters-info">
          <IconInfo width={21} height={20} />
          <Elem name="filters-title">All regions hidden</Elem>
          <Elem name="filters-description">Adjust or remove the filters to view</Elem>
        </Block>
      ) : regions?.regions?.length > 0 ? (
        <>
          <OutlinerTree
            regions={regions}
            footer={hiddenRegions > 0 && (
              <Block name="filters-info">
                <IconInfo width={21} height={20} />
                <Elem name="filters-title">There {hiddenRegions === 1 ? 'is' : 'are'} {hiddenRegions} hidden region{hiddenRegions > 1 && 's'}</Elem>
                <Elem name="filters-description">Adjust or remove filters to view</Elem>
              </Block>
            )}
          />
        </>
      ) : (
        <Elem name="empty">
          Regions not added
        </Elem>
      )}
    </>
  );
});

export const OutlinerComponent = observer(OutlinerStandAlone);

export const OutlinerPanel = observer(OutlinerPanelComponent);
