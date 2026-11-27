import type { ReactElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MSTAnnotation, MSTStore } from "../../../stores/types";
import TaskSummaryV2 from "../TaskSummaryV2";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

const renderWithQueryClient = (ui: ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

Object.defineProperty(window, "APP_SETTINGS", {
  value: {
    user: { id: 1, displayName: "Test User" },
    feature_flags: {},
    feature_flags_default_value: false,
  },
  writable: true,
});

const createMockAnnotation = (overrides: Partial<MSTAnnotation> = {}): MSTAnnotation =>
  ({
    id: "1",
    pk: "1",
    type: "annotation",
    user: { id: 1, email: "u@example.com" },
    createdBy: "Test User",
    versions: { result: [] },
    results: [],
    ...overrides,
  }) as MSTAnnotation;

const createMockStore = (): MSTStore["annotationStore"] =>
  ({
    store: {
      task: { id: 1, dataObj: { text: "x" }, agreement: null },
      project: { review_settings: { show_agreement_to_reviewers: true } },
      hasInterface: () => false,
    },
    names: new Map(),
    selectAnnotation: () => {},
    selectPrediction: () => {},
  }) as unknown as MSTStore["annotationStore"];

// --- API mocks via global fetch ----------------------------------------------

const installFetchMock = (responses: Record<string, unknown>) => {
  const original = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    for (const [pattern, body] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        return Promise.resolve(
          new Response(JSON.stringify(body), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
    }
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
  }) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
};

describe("TaskSummaryV2 — fallback when agreement is unavailable", () => {
  let restoreFetch: () => void;

  beforeEach(() => {
    restoreFetch = installFetchMock({
      "/summary/": {
        task: { id: 1, agreement: null },
        total_annotations: 0,
        total_predictions: 0,
        annotations: [],
        distributions: {},
        agreement: {}, // empty object → hasAgreementData=false
      },
      "/ground-truth-inference/": { dimensions: {} },
    });
  });

  afterEach(() => {
    restoreFetch();
  });

  it("renders the 'Agreement is not available' message when the API returns no agreement data", async () => {
    const annotations = [createMockAnnotation()];
    const store = createMockStore();

    renderWithQueryClient(<TaskSummaryV2 annotations={annotations} store={store} />);

    await waitFor(() => {
      expect(screen.getByText("Agreement is not available for this task.")).toBeInTheDocument();
    });
    expect(screen.getByText("Agreement is only calculated for submitted annotations, not drafts.")).toBeInTheDocument();
  });

  it("does not render the LabelingSummary table when agreement data is unavailable", async () => {
    const annotations = [createMockAnnotation()];
    const store = createMockStore();

    renderWithQueryClient(<TaskSummaryV2 annotations={annotations} store={store} />);

    await waitFor(() => {
      expect(screen.getByText("Agreement is not available for this task.")).toBeInTheDocument();
    });
    // The OSS LabelingSummary used to render an "Annotator" header column. With the new
    // fallback we render a message instead, so that header should not be present.
    expect(screen.queryByText("Annotator")).not.toBeInTheDocument();
  });
});
