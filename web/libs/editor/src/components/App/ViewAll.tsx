import { usePersistentState } from "@humansignal/core/lib/hooks/usePersistentState";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@humansignal/ui/lib/tabs";
import type { MSTAnnotation, MSTStore } from "../../stores/types";
import TaskSummary from "../TaskSummary/TaskSummary";
import TaskSummaryV2 from "../TaskSummary/TaskSummaryV2";
import Grid from "./Grid";

type Props = {
  store: MSTStore["annotationStore"];
  annotations: MSTAnnotation[];
  root: any;
};

export const ViewAll = ({ store: annotationStore, annotations, root }: Props) => {
  const [tab, setTab] = usePersistentState<"summary" | "compare">("view-all-tab", "summary");
  const SummaryComponent = ff.isActive(ff.FF_UTC_554_AGREEMENT_V2_IN_TASK_SUMMARY_VIEW) ? TaskSummaryV2 : TaskSummary;

  if (annotationStore.store.hasInterface("annotations:summary")) {
    return (
      <div className="px-base pt-tighter mt-base">
        <Tabs variant="default" value={tab} onValueChange={(value) => setTab(value as "summary" | "compare")}>
          <TabsList>
            <TabsTrigger value="summary" data-testid="compare-all-summary-tab">
              Summary
            </TabsTrigger>
            <TabsTrigger value="compare" data-testid="compare-all-side-by-side-tab">
              Side-by-side
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <SummaryComponent store={annotationStore} annotations={annotations} />
          </TabsContent>

          <TabsContent value="compare">
            <Grid store={annotationStore} annotations={annotations} root={root} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return <Grid store={annotationStore} annotations={annotations} root={root} />;
};
