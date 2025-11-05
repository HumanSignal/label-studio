import { observer } from "mobx-react";
import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "../../../utils/bem";
import { PanelBase, type PanelProps } from "../PanelBase";
import { OutlinerTree } from "./OutlinerTree";
import { ViewControls } from "./ViewControls";
import "./OutlinerPanel.scss";
import { IconInfo } from "@humansignal/icons";
import { IconLsLabeling } from "@humansignal/ui";
import { EmptyState } from "../Components/EmptyState";
import { getDocsUrl } from "../../../utils/docs";

// Local type definitions based on ViewControls and RegionStore
type GroupingOptions = "manual" | "label" | "type";
type OrderingOptions = "score" | "date" | "mediaStartTime";

interface OutlinerPanelProps extends PanelProps {
  regions: any;
}

interface OutlinerTreeComponentProps {
  regions: any;
}

const OutlinerFFClasses: string[] = [];

OutlinerFFClasses.push("ff_hide_all_regions");

const OutlinerPanelComponent: FC<OutlinerPanelProps> = ({ regions, ...props }) => {
  const [group, setGroup] = useState<GroupingOptions>(regions.group);
  const onOrderingChange = useCallback(
    (value: OrderingOptions) => {
      regions.setSort(value);
    },
    [regions],
  );

  const onGroupingChange = useCallback(
    (value: GroupingOptions) => {
      regions.setGrouping(value);
      setGroup(value);
    },
    [regions],
  );

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
      />
      <OutlinerTreeComponent regions={regions} />
    </PanelBase>
  );
};

const OutlinerStandAlone: FC<OutlinerPanelProps> = ({ regions }) => {
  const onOrderingChange = useCallback(
    (value: OrderingOptions) => {
      regions.setSort(value);
    },
    [regions],
  );

  const onGroupingChange = useCallback(
    (value: GroupingOptions) => {
      regions.setGrouping(value);
    },
    [regions],
  );

  return (
    <div
      className={cn("outliner")
        .mix(...OutlinerFFClasses)
        .toClassName()}
    >
      <ViewControls
        ordering={regions.sort}
        regions={regions}
        orderingDirection={regions.sortOrder}
        onOrderingChange={onOrderingChange}
        onGroupingChange={onGroupingChange}
      />
      <OutlinerTreeComponent regions={regions} />
    </div>
  );
};

const OutlinerEmptyState = () => (
  <EmptyState
    icon={<IconLsLabeling width={24} height={24} />}
    header="Labeled regions will appear here"
    description={
      <>
        <span>
          Start labeling and track your results
          <br />
          using this panel
        </span>
      </>
    }
    learnMore={{ href: getDocsUrl("guide/labeling"), text: "Learn more", testId: "regions-panel-learn-more" }}
  />
);

const OutlinerTreeComponent: FC<OutlinerTreeComponentProps> = observer(({ regions }) => {
  const allRegionsHidden = regions?.regions?.length > 0 && regions?.filter?.length === 0;

  const hiddenRegions = useMemo(() => {
    if (!regions?.regions?.length || !regions.filter?.length) return 0;

    return regions?.regions?.length - regions?.filter?.length;
  }, [regions?.regions?.length, regions?.filter?.length]);

  return (
    <>
      {allRegionsHidden ? (
        <div className={cn("filters-info").toClassName()}>
          <IconInfo width={21} height={20} />
          <div className={cn("filters-info").elem("filters-title").toClassName()}>All regions hidden</div>
          <div className={cn("filters-info").elem("filters-description").toClassName()}>
            Adjust or remove the filters to view
          </div>
        </div>
      ) : regions?.regions?.length > 0 ? (
        <>
          <OutlinerTree
            regions={regions}
            footer={
              hiddenRegions > 0 && (
                <div className={cn("filters-info").toClassName()}>
                  <IconInfo width={21} height={20} />
                  <div className={cn("filters-info").elem("filters-title").toClassName()}>
                    There {hiddenRegions === 1 ? "is" : "are"} {hiddenRegions} hidden region{hiddenRegions > 1 && "s"}
                  </div>
                  <div className={cn("filters-info").elem("filters-description").toClassName()}>
                    Adjust or remove filters to view
                  </div>
                </div>
              )
            }
          />
        </>
      ) : (
        <OutlinerEmptyState />
      )}
    </>
  );
});

export const OutlinerComponent = observer(OutlinerStandAlone);

export const OutlinerPanel = observer(OutlinerPanelComponent);
