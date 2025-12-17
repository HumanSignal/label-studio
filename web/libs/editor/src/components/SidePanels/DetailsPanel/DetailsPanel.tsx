import { inject, observer } from "mobx-react";
import type { FC } from "react";
import { mean } from "lodash";
import { Block, Elem } from "../../../utils/bem";
import { Comments as CommentsComponent } from "../../Comments/Comments";
import { AnnotationHistory } from "../../CurrentEntity/AnnotationHistory";
import { PanelBase, type PanelProps } from "../PanelBase";
import "./DetailsPanel.scss";
import { RegionDetailsMain, RegionDetailsMeta } from "./RegionDetails";
import { RegionItem } from "./RegionItem";
import { Relations as RelationsComponent } from "./Relations";
// eslint-disable-next-line
// @ts-ignore
import { RelationsControls } from "./RelationsControls";
import { EmptyState } from "../Components/EmptyState";
import { IconCursor, IconRelationLink } from "@humansignal/icons";
import { getDocsUrl } from "../../../utils/docs";

interface DetailsPanelProps extends PanelProps {
  regions: any;
  selection: any;
}

type OneMetricStats = {
  n: number;
  mean: number | null;
  sd: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
};

type RegionStats = {
  area: OneMetricStats;
  width: OneMetricStats;
  height: OneMetricStats;
  meanR: OneMetricStats;
  meanG: OneMetricStats;
  meanB: OneMetricStats;
};

const emptyMetricStats: OneMetricStats = {
  n: 0,
  mean: null,
  sd: null,
  p25: null,
  p50: null,
  p75: null,
};

const computeArrayStats = (values: number[]): OneMetricStats => {
  const n = values.length;

  if (n === 0) return emptyMetricStats;

  const m = mean(values);

  if (m == null || Number.isNaN(m)) return { ...emptyMetricStats, n };

  const variance =
    n > 1
      ? values.reduce((sum, v) => {
          const d = v - m;
          return sum + d * d;
        }, 0) / n
      : 0;

  const sorted = [...values].sort((a, b) => a - b);

  const percentile = (p: number): number => {
    if (n === 1) return sorted[0];

    const idx = (n - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);

    if (lo === hi) return sorted[lo];

    const w = idx - lo;

    return sorted[lo] * (1 - w) + sorted[hi] * w;
  };

  return {
    n,
    mean: m,
    sd: n > 1 ? Math.sqrt(variance) : null,
    p25: percentile(0.25),
    p50: percentile(0.5),
    p75: percentile(0.75),
  };
};

const safeNumber = (value: unknown): number | null => {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const computeRegionStats = (regions: any[]): RegionStats => {
  const areas: number[] = [];
  const widths: number[] = [];
  const heights: number[] = [];
  const meanRs: number[] = [];
  const meanGs: number[] = [];
  const meanBs: number[] = [];

  regions.forEach((region) => {
    const meta = region?.meta ?? {};
    const area = safeNumber(meta.area);
    const bbox = meta.bbox ?? {};

    const width = safeNumber(bbox.width);
    const height = safeNumber(bbox.height);

    const r = safeNumber(meta.mean_r);
    const g = safeNumber(meta.mean_g);
    const b = safeNumber(meta.mean_b);

    if (area != null) areas.push(area);
    if (width != null) widths.push(width);
    if (height != null) heights.push(height);
    if (r != null) meanRs.push(r);
    if (g != null) meanGs.push(g);
    if (b != null) meanBs.push(b);
  });

  return {
    area: computeArrayStats(areas),
    width: computeArrayStats(widths),
    height: computeArrayStats(heights),
    meanR: computeArrayStats(meanRs),
    meanG: computeArrayStats(meanGs),
    meanB: computeArrayStats(meanBs),
  };
};

const DetailsPanelComponent: FC<DetailsPanelProps> = ({ currentEntity, regions, ...props }) => {
  const selectedRegions = regions.selection;

  return (
    <PanelBase {...props} currentEntity={currentEntity} name="details" title="Details">
      <Content selection={selectedRegions} currentEntity={currentEntity} />
    </PanelBase>
  );
};

const DetailsComponent: FC<DetailsPanelProps> = ({ currentEntity, regions }) => {
  const selectedRegions = regions.selection;

  return (
    <Block name="details-tab">
      <Content selection={selectedRegions} currentEntity={currentEntity} />
    </Block>
  );
};

const Content: FC<any> = observer(function Content({ selection, currentEntity }: any): JSX.Element {
  return <>{selection.size ? <RegionsPanel regions={selection} /> : <GeneralPanel currentEntity={currentEntity} />}</>;
});

const CommentsTab: FC<any> = inject("store")(
  observer(function CommentsTab({ store }: any): JSX.Element {
    return (
      <>
        {store.hasInterface("annotations:comments") && store.commentStore.isCommentable && (
          <Block name="comments-panel">
            <Elem name="section-tab">
              <Elem name="section-content">
                <CommentsComponent
                  annotationStore={store.annotationStore}
                  commentStore={store.commentStore}
                  cacheKey={`task.${store.task.id}`}
                />
              </Elem>
            </Elem>
          </Block>
        )}
      </>
    );
  }),
);

const RelationsTab: FC<any> = inject("store")(
  observer(function RelationsTab({ currentEntity }: any): JSX.Element {
    const { relationStore } = currentEntity;
    const hasRelations = relationStore.size > 0;

    return (
      <>
        <Block name="relations">
          <Elem name="section-tab">
            {hasRelations ? (
              <>
                <Elem name="view-control">
                  <Elem name="section-head">Relations ({relationStore.size})</Elem>
                  <RelationsControls relationStore={relationStore} />
                </Elem>
                <Elem name="section-content">
                  <RelationsComponent relationStore={relationStore} />
                </Elem>
              </>
            ) : (
              <EmptyState
                icon={<IconRelationLink width={24} height={24} />}
                header="Create relations between regions"
                description={<>Link regions to define relationships between them</>}
                learnMore={{
                  href: getDocsUrl("guide/labeling#Add-relations-between-annotations"),
                  text: "Learn more",
                  testId: "relations-panel-learn-more",
                }}
              />
            )}
          </Elem>
        </Block>
      </>
    );
  }),
);

const HistoryTab: FC<any> = inject("store")(
  observer(function HistoryTab({ store, currentEntity }: any): JSX.Element {
    const showAnnotationHistory = store.hasInterface("annotations:history");

    return (
      <>
        <Block name="history">
          <Elem name="section-tab">
            <AnnotationHistory
              inline
              enabled={showAnnotationHistory}
              sectionHeader={
                <>
                  Annotation History
                  <span>#{currentEntity.pk ?? currentEntity.id}</span>
                </>
              }
            />
          </Elem>
        </Block>
      </>
    );
  }),
);

const InfoTab: FC<any> = inject("store")(
  observer(function InfoTab({ selection }: any): JSX.Element {
    const nothingSelected = !selection || selection.size === 0;
    return (
      <>
        <Block name="info">
          <Elem name="section-tab">
            {nothingSelected ? (
              <EmptyState
                icon={<IconCursor width={24} height={24} />}
                header="View region details"
                description={<>Select a region to view its properties, metadata and available actions</>}
              />
            ) : (
              <>
                <Elem name="section-head">Selection Details</Elem>
                <RegionsPanel regions={selection} />
              </>
            )}
          </Elem>
        </Block>
      </>
    );
  }),
);

const StatsTab: FC<any> = inject("store")(
  observer(function StatsTab({ selection, currentEntity }: any): JSX.Element {
    const selectionHasRegions = selection && selection.size > 0;
    const allRegions: any[] = currentEntity?.regionStore?.list ?? [];
    const sourceRegions: any[] = selectionHasRegions ? selection.list ?? [] : allRegions;

    const stats = computeRegionStats(sourceRegions);

    const hasAnyData =
      stats.area.n > 0 ||
      stats.width.n > 0 ||
      stats.height.n > 0 ||
      stats.meanR.n > 0 ||
      stats.meanG.n > 0 ||
      stats.meanB.n > 0;

    if (!hasAnyData) {
      return (
        <Block name="stats">
          <Elem name="section-tab">
            <EmptyState
              icon={<IconCursor width={24} height={24} />}
              header="View region statistics"
              description={
                <>Create or select regions with geometry or RGB metadata to see summary statistics</>
              }
            />
          </Elem>
        </Block>
      );
    }

    const totalRegions = sourceRegions.length;
    const scopeLabel = selectionHasRegions
      ? `Selection (${totalRegions} region${totalRegions === 1 ? "" : "s"})`
      : `All regions in image (${totalRegions} region${totalRegions === 1 ? "" : "s"})`;

    const formatNumber = (value: number | null, digits = 2): string => {
      if (value == null || Number.isNaN(value)) return "-";
      return value.toFixed(digits);
    };

    const renderRow = (label: string, metric: OneMetricStats, digits: number) => {
      return (
        <tr key={label}>
          <th scope="row">{label}</th>
          <td>{metric.n}</td>
          <td>{metric.mean != null ? formatNumber(metric.mean, digits) : "-"}</td>
          <td>{metric.sd != null ? formatNumber(metric.sd, digits) : "-"}</td>
          <td>{metric.p25 != null ? formatNumber(metric.p25, digits) : "-"}</td>
          <td>{metric.p50 != null ? formatNumber(metric.p50, digits) : "-"}</td>
          <td>{metric.p75 != null ? formatNumber(metric.p75, digits) : "-"}</td>
        </tr>
      );
    };

    return (
      <Block name="stats">
        <Elem name="section-tab">
          <Elem name="section-head">Region Statistics</Elem>
          <Elem name="section-content">
            <div className="stats__scope" data-testid="stats-scope">
              {scopeLabel}
            </div>
            <table className="stats__table" data-testid="region-stats-table">
              <thead>
                <tr>
                  <th scope="col">Metric</th>
                  <th scope="col">Count</th>
                  <th scope="col">Mean</th>
                  <th scope="col">SD</th>
                  <th scope="col">P25</th>
                  <th scope="col">Median</th>
                  <th scope="col">P75</th>
                </tr>
              </thead>
              <tbody>
                {renderRow("Area (px)", stats.area, 0)}
                {renderRow("Width (px)", stats.width, 0)}
                {renderRow("Height (px)", stats.height, 0)}
                {renderRow("Mean R", stats.meanR, 2)}
                {renderRow("Mean G", stats.meanG, 2)}
                {renderRow("Mean B", stats.meanB, 2)}
              </tbody>
            </table>
          </Elem>
        </Elem>
      </Block>
    );
  }),
);

const GeneralPanel: FC<any> = inject("store")(
  observer(function GeneralPanel({ store, currentEntity }: any): JSX.Element {
    const { relationStore } = currentEntity;
    const showAnnotationHistory = store.hasInterface("annotations:history");
    return (
      <>
        <Elem name="section">
          <AnnotationHistory
            inline
            enabled={showAnnotationHistory}
            sectionHeader={
              <>
                Annotation History
                <span>#{currentEntity.pk ?? currentEntity.id}</span>
              </>
            }
          />
        </Elem>
        <Elem name="section">
          <Elem name="view-control">
            <Elem name="section-head">Relations ({relationStore.size})</Elem>
            <RelationsControls relationStore={relationStore} />
          </Elem>
          <Elem name="section-content">
            <RelationsComponent relationStore={relationStore} />
          </Elem>
        </Elem>
        {store.hasInterface("annotations:comments") && store.commentStore.isCommentable && (
          <Elem name="section">
            <Elem name="section-head">Comments</Elem>
            <Elem name="section-content">
              <CommentsComponent
                annotationStore={store.annotationStore}
                commentStore={store.commentStore}
                cacheKey={`task.${store.task.id}`}
              />
            </Elem>
          </Elem>
        )}
      </>
    );
  }),
);

GeneralPanel.displayName = "GeneralPanel";

const RegionsPanel: FC<{ regions: any }> = observer(function RegionsPanel({ regions }: { regions: any }): JSX.Element {
  return (
    <div>
      {regions.list.map((reg: any) => {
        return <SelectedRegion key={reg.id} region={reg} />;
      })}
    </div>
  );
});

const SelectedRegion: FC<{ region: any }> = observer(function SelectedRegion({ region }: { region: any }): JSX.Element {
  return <RegionItem region={region} mainDetails={RegionDetailsMain} metaDetails={RegionDetailsMeta} />;
});

export const Comments = CommentsTab;
export const History = HistoryTab;
export const Relations = RelationsTab;
export const Info = InfoTab;
export const Stats = StatsTab;
export const Details = observer(DetailsComponent);
export const DetailsPanel = observer(DetailsPanelComponent);
