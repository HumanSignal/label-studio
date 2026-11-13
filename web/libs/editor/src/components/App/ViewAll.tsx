import { usePersistentState, usePersistentJSONState } from "@humansignal/core/lib/hooks/usePersistentState";
import { emitCompareAllViewSelected } from "../../utils/labelingTelemetry";
import { SegmentedControl, Toggle } from "@humansignal/ui";
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
        <div
          className={
            isAgreementV2
              ? "flex items-center justify-between gap-base mb-tight"
              : "flex items-center gap-base mb-tight"
          }
        >
          <SegmentedControl
            aria-label="Annotations view"
            selectedOption={tab}
            onChange={handleCompareViewChange}
            options={[
              { value: "summary", label: "Summary", "data-testid": "compare-all-summary-tab" },
              { value: "compare", label: "Side-by-side", "data-testid": "compare-all-side-by-side-tab" },
            ]}
          />

          {isAgreementV2 && (
            <Toggle
              checked={includePredictions}
              onChange={(e) => setIncludePredictions(Boolean(e.target.checked))}
              label="Include Predictions"
              data-testid="compare-all-include-predictions-toggle"
            />
          )}
        </div>

        <div className="mt-tight">
          {tab === "summary" ? (
            isAgreementV2 ? (
              <TaskSummaryV2
                key={includePredictions ? "summary-with-predictions" : "summary-annotations-only"}
                store={annotationStore}
                annotations={annotations}
                includePredictions={includePredictions}
              />
            ) : (
              <TaskSummary store={annotationStore} annotations={annotations} />
            )
          ) : (
            <Grid
              key={effectiveIncludePredictions ? "grid-with-predictions" : "grid-annotations-only"}
              store={annotationStore}
              annotations={annotations}
              root={root}
              includePredictions={effectiveIncludePredictions}
            />
          )}
        </div>
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
