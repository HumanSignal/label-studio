import { observer } from "mobx-react";
import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../utils/bem";
import { PanelBase, type PanelProps } from "../PanelBase";
import { OutlinerTree } from "./OutlinerTree";
import { ViewControls } from "./ViewControls";
import "./OutlinerPanel.prefix.css";
import { IconInfo, IconLsLabeling } from "@humansignal/icons";
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
  const { t } = useTranslation();
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
    <PanelBase {...props} name="outliner" mix={OutlinerFFClasses} title={t("editor:outlinerTitle")}>
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

const OutlinerEmptyState = () => {
  const { t } = useTranslation();

  return (
    <EmptyState
      icon={<IconLsLabeling width={24} height={24} />}
      header={t("editor:outlinerEmptyHeader")}
      description={
        <>
          <span>
            {t("editor:outlinerEmptyDescription1")}
            <br />
            {t("editor:outlinerEmptyDescription2")}
          </span>
        </>
      }
      learnMore={{
        href: getDocsUrl("guide/labeling"),
        text: t("editor:learnMore"),
        testId: "regions-panel-learn-more",
      }}
    />
  );
};

const OutlinerTreeComponent: FC<OutlinerTreeComponentProps> = observer(({ regions }) => {
  const { t } = useTranslation();
  const allRegionsHidden = regions?.regions?.length > 0 && regions?.filter?.length === 0;
  const hasClassifications = regions?.classificationAreas?.length > 0;
  const hasContent = regions?.regions?.length > 0 || hasClassifications;

  const hiddenRegions = useMemo(() => {
    if (!regions?.regions?.length || !regions.filter?.length) return 0;

    return regions?.regions?.length - regions?.filter?.length;
  }, [regions?.regions?.length, regions?.filter?.length]);

  return (
    <>
      {allRegionsHidden && !hasClassifications ? (
        <div className={cn("filters-info").toClassName()}>
          <IconInfo width={21} height={20} />
          <div className={cn("filters-info").elem("filters-title").toClassName()}>{t("editor:allRegionsHidden")}</div>
          <div className={cn("filters-info").elem("filters-description").toClassName()}>
            {t("editor:adjustOrRemoveTheFiltersToView")}
          </div>
        </div>
      ) : hasContent ? (
        <>
          <OutlinerTree
            regions={regions}
            footer={
              hiddenRegions > 0 && (
                <div className={cn("filters-info").toClassName()}>
                  <IconInfo width={21} height={20} />
                  <div className={cn("filters-info").elem("filters-title").toClassName()}>
                    {t("editor:hiddenRegionsCount", { count: hiddenRegions })}
                  </div>
                  <div className={cn("filters-info").elem("filters-description").toClassName()}>
                    {t("editor:adjustOrRemoveFiltersToView")}
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
