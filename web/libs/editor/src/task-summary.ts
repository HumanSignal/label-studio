/**
 * Public entry point for the Agreement Explorer dashboard.
 *
 * Kept deliberately narrow — it exposes only the store-agnostic dashboard, so
 * consumers outside this library (the LSE editor-shell) pull in the agreement
 * components without dragging in the MST editor.
 */

export { TaskSummaryDashboard } from "./components/TaskSummary/TaskSummaryDashboard";
/**
 * The dashboard queries through react-query, and LSE resolves its own copy of
 * the package. Re-exporting the client and provider from here keeps hosts on
 * the single instance whose context the dashboard hooks actually read.
 */
export { QueryClient, QueryClientProvider } from "@tanstack/react-query";
export type {
  TaskSummaryAnnotationRef,
  TaskSummaryDashboardProps,
} from "./components/TaskSummary/TaskSummaryDashboard";
export type {
  TaskSummaryCurrentUser,
  TaskSummaryFetchers,
} from "./components/TaskSummary/agreement-dashboard/use-task-summary-data";
export type {
  GroundTruthInferenceResponse,
  TaskSummaryResponse,
} from "./components/TaskSummary/agreement-dashboard/types";
export type { LabelColors, ObjectTypes } from "./components/TaskSummary/types";
