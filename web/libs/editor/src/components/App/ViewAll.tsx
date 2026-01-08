import clsx from "clsx";
import { usePersistentState } from "@humansignal/core/lib/hooks/usePersistentState";
import type { MSTAnnotation, MSTStore } from "../../stores/types";
import TaskSummary from "../TaskSummary/TaskSummary";
import Grid from "./Grid";

import styles from "./ViewAll.module.scss";

type Props = {
  store: MSTStore["annotationStore"];
  annotations: MSTAnnotation[];
  root: any;
};

const Tab = ({ title, active, onSelect }: { title: string; active: boolean; onSelect: () => void }) => {
  return (
    <div className={clsx(styles.tab, { [styles.active]: active })} onClick={onSelect}>
      {title}
    </div>
  );
};

export const ViewAll = ({ store: annotationStore, annotations, root }: Props) => {
  const [tab, setTab] = usePersistentState<"summary" | "compare">("view-all-tab", "summary");

  if (annotationStore.store.hasInterface("annotations:summary")) {
    return (
      <div>
        <div className={styles.tabs}>
          <Tab title="Summary" active={tab === "summary"} onSelect={() => setTab("summary")} />
          <Tab title="Compare" active={tab === "compare"} onSelect={() => setTab("compare")} />
        </div>
        {tab === "summary" && (
          <div>
            <TaskSummary store={annotationStore} annotations={annotations} />
          </div>
        )}
        {tab === "compare" && (
          <div>
            <Grid store={annotationStore} annotations={annotations} root={root} />
          </div>
        )}
      </div>
    );
  }

  return <Grid store={annotationStore} annotations={annotations} root={root} />;
};
