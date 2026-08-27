import { usePersistentState, usePersistentJSONState } from "@humansignal/core/lib/hooks/usePersistentState";
import { emitCompareAllViewSelected } from "../../utils/labelingTelemetry";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@humansignal/ui/lib/tabs";
import { Toggle } from "@humansignal/ui";
import type { MSTAnnotation, MSTStore } from "../../stores/types";
import TaskSummary from "../TaskSummary/TaskSummary";
import TaskSummaryV2 from "../TaskSummary/TaskSummaryV2";
import Grid from "./Grid";
import { ff } from "@humansignal/core";

type Props = {
  store: MSTStore["annotationStore"];
  annotations: MSTAnnotation[];
  root: any;
};

export const ViewAll = ({ store: annotationStore, annotations, root }: Props) => {
  const [tab, setTab] = usePersistentState<"summary" | "compare">("view-all-tab", "summary");
  const [includePredictions, setIncludePredictions] = usePersistentJSONState<boolean>(
    "compare-all-include-predictions",
    false,
  );
  const isAgreementV2 = ff.isActive(ff.FF_UTC_554_AGREEMENT_V2_IN_TASK_SUMMARY_VIEW);
  /** Side-by-side only filters predictions when Agreement V2 toggle is available; V1 always shows them. */
  const effectiveIncludePredictions = !isAgreementV2 || includePredictions;

  const handleCompareViewChange = (value: string) => {
    const view = value as "summary" | "compare";
    setTab(view);
    emitCompareAllViewSelected(annotationStore.store, view);
  };

  if (annotationStore.store.hasInterface("annotations:summary")) {
    return (
      <div className="px-base pt-tighter mt-base">
        <Tabs variant="default" value={tab} onValueChange={handleCompareViewChange}>
          <div
            className={
              isAgreementV2
                ? "flex items-center justify-between gap-base mb-tight"
                : "flex items-center gap-base mb-tight"
            }
          >
            <TabsList>
              <TabsTrigger value="summary" data-testid="compare-all-summary-tab">
                Summary
              </TabsTrigger>
              <TabsTrigger value="compare" data-testid="compare-all-side-by-side-tab">
                Side-by-side
              </TabsTrigger>
            </TabsList>

            {isAgreementV2 && (
              <Toggle
                checked={includePredictions}
                onChange={(e) => setIncludePredictions(Boolean(e.target.checked))}
                label="Include Predictions"
                data-testid="compare-all-include-predictions-toggle"
              />
            )}
          </div>

          <TabsContent value="summary">
            {isAgreementV2 ? (
              <TaskSummaryV2
                key={includePredictions ? "summary-with-predictions" : "summary-annotations-only"}
                store={annotationStore}
                annotations={annotations}
                includePredictions={includePredictions}
              />
            ) : (
              <TaskSummary store={annotationStore} annotations={annotations} />
            )}
          </TabsContent>

          <TabsContent value="compare">
            <Grid
              key={effectiveIncludePredictions ? "grid-with-predictions" : "grid-annotations-only"}
              store={annotationStore}
              annotations={annotations}
              root={root}
              includePredictions={effectiveIncludePredictions}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <Grid
      store={annotationStore}
      annotations={annotations}
      root={root}
      includePredictions={effectiveIncludePredictions}
    />
  );
};
