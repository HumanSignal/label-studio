import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MSTAnnotation, MSTStore } from "../../../stores/types";
import { FF_FIT_720_LAZY_LOAD_ANNOTATIONS } from "@humansignal/core/lib/utils/feature-flags";
import TaskSummary from "../TaskSummary";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const renderWithQueryClient = (ui: ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

// Polyfill for Object.groupBy which may not be available in test environment
if (!Object.groupBy) {
  Object.groupBy = <T, K extends PropertyKey>(
    items: Iterable<T>,
    keySelector: (item: T, index: number) => K,
  ): Partial<Record<K, T[]>> => {
    const result: Partial<Record<K, T[]>> = {};
    let index = 0;
    for (const item of items) {
      const key = keySelector(item, index++);
      if (!result[key]) {
        result[key] = [];
      }
      (result[key] as T[]).push(item);
    }
    return result;
  };
}

// Mock global APP_SETTINGS for user context and feature flags
Object.defineProperty(window, "APP_SETTINGS", {
  value: {
    user: {
      id: 1,
      displayName: "Test User",
    },
    feature_flags: {},
    feature_flags_default_value: false,
  },
  writable: true,
});

const renderWithProviders = (
  ui: React.ReactElement,
  options?: { queryClient?: QueryClient; featureFlags?: Record<string, boolean> },
) => {
  const queryClient = options?.queryClient ?? createTestQueryClient();
  if (options?.featureFlags) {
    Object.assign(window.APP_SETTINGS.feature_flags, options.featureFlags);
  }
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe("TaskSummary", () => {
  interface MockUser {
    id: number;
    displayName: string;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    initials: string;
    avatar: string | null;
    active: boolean;
  }

  interface MockControlTag {
    isControlTag: boolean;
    type: string;
    toname: string;
    perregion?: boolean;
    children?: Array<{ value: string; background: string }>;
  }

  interface MockObjectTag {
    isObjectTag: boolean;
    type: string;
    value: string;
    _value?: string;
    parsedValue?: string;
    _url?: string;
    dataObj?: Record<string, unknown>;
  }

  const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
    id: 1,
    displayName: "John Doe",
    firstName: "John",
    lastName: "Doe",
    username: "johndoe",
    email: "john@example.com",
    initials: "JD",
    avatar: null,
    active: true,
    ...overrides,
  });

  const createMockAnnotation = (overrides: Partial<MSTAnnotation> = {}): MSTAnnotation =>
    ({
      id: "1",
      pk: "1",
      type: "annotation",
      user: createMockUser(),
      createdBy: "John Doe",
      versions: {
        result: [{ from_name: "label", to_name: "text", type: "choices", value: { choices: ["positive"] } }],
      },
      results: [],
      ...overrides,
    }) as MSTAnnotation;

  const createMockControlTag = (name: string, type = "choices"): [string, MockControlTag] => [
    name,
    {
      isControlTag: true,
      type,
      toname: "text",
      perregion: false,
      children: [
        { value: "positive", background: "#ff0000" },
        { value: "negative", background: "#00ff00" },
      ],
    },
  ];

  const createMockObjectTag = (name: string, type = "text"): [string, MockObjectTag] => [
    name,
    {
      isObjectTag: true,
      type,
      value: `$${name}`, // Need $ prefix for object tags
      _value: "Sample text content",
    },
  ];

  interface MockStoreOverrides {
    task?: {
      dataObj?: Record<string, unknown>;
      agreement?: number;
    };
    project?: {
      review_settings?: {
        show_agreement_to_reviewers?: boolean;
      };
    } | null;
    store?: Record<string, unknown>;
    names?: Array<[string, MockControlTag | MockObjectTag]>;
  }

  const createMockStore = (overrides: MockStoreOverrides = {}): MSTStore["annotationStore"] => {
    const defaultNames = [createMockControlTag("label"), createMockObjectTag("text")];
    const allNames = [...defaultNames, ...(overrides.names || [])];

    const mockStore = {
      store: {
        task: {
          id: 1,
          dataObj: { text: "Sample text", id: 1 },
          agreement: 85.5,
          ...overrides.task,
        },
        project: {
          review_settings: {
            show_agreement_to_reviewers: true,
          },
          ...overrides.project,
        },
        hasInterface: (interfaceName: string) => false,
        ...overrides.store,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      names: new Map(allNames as Array<[string, any]>),
      selectAnnotation: jest.fn(),
      selectPrediction: jest.fn(),
    };

    return mockStore as unknown as MSTStore["annotationStore"];
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset feature flags to default (FF off) for each test
    window.APP_SETTINGS.feature_flags = { [FF_FIT_720_LAZY_LOAD_ANNOTATIONS]: false };
  });

  it("renders the main headings", () => {
    const annotations = [createMockAnnotation()];
    const store = createMockStore();

    renderWithQueryClient(<TaskSummary annotations={annotations} store={store} />);

    expect(screen.getByText("Task Summary")).toBeInTheDocument();
    expect(screen.getByText("Task Data")).toBeInTheDocument();
  });

  it("displays agreement when enabled in project settings", () => {
    const annotations = [createMockAnnotation()];
    const store = createMockStore({
      project: {
        review_settings: {
          show_agreement_to_reviewers: true,
        },
      },
    });

    renderWithQueryClient(<TaskSummary annotations={annotations} store={store} />);

    expect(screen.getByText("Agreement")).toBeInTheDocument();
    expect(screen.getByText("85.5%")).toBeInTheDocument();
  });

  it("shows agreement when backend provides it (regardless of frontend settings)", () => {
    const annotations = [createMockAnnotation()];
    const store = createMockStore({
      project: {
        review_settings: {
          show_agreement_to_reviewers: false,
        },
      },
    });

    renderWithQueryClient(<TaskSummary annotations={annotations} store={store} />);

    // Backend controls agreement visibility, so if we have a number, show it
    expect(screen.getByText("Agreement")).toBeInTheDocument();
    expect(screen.getByText("85.5%")).toBeInTheDocument();
  });

  it("shows agreement even when project is null", () => {
    const annotations = [createMockAnnotation()];
    const store = createMockStore({
      project: null,
    });

    renderWithQueryClient(<TaskSummary annotations={annotations} store={store} />);

    // Backend controls agreement visibility, so if we have a number, show it
    expect(screen.getByText("Agreement")).toBeInTheDocument();
    expect(screen.getByText("85.5%")).toBeInTheDocument();
  });

  it("counts submitted annotations correctly (excludes drafts)", () => {
    const annotations = [
      createMockAnnotation({ pk: "1", type: "annotation" }),
      createMockAnnotation({ pk: "2", type: "annotation" }),
      createMockAnnotation({ pk: undefined, type: "annotation" }), // draft - should be excluded
      createMockAnnotation({ pk: "", type: "annotation" }), // draft - should be excluded
    ];
    const store = createMockStore();

    renderWithQueryClient(<TaskSummary annotations={annotations} store={store} />);

    expect(screen.getByText("Annotations")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // Only submitted annotations
  });

  it("counts predictions correctly", () => {
    const annotations = [
      createMockAnnotation({ pk: "1", type: "annotation" }),
      createMockAnnotation({ pk: "2", type: "prediction" }),
      createMockAnnotation({ pk: "3", type: "prediction" }),
      createMockAnnotation({ pk: undefined, type: "prediction" }), // draft - should be excluded
    ];
    const store = createMockStore();

    renderWithQueryClient(<TaskSummary annotations={annotations} store={store} />);

    expect(screen.getByText("Predictions")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // Only submitted predictions
  });

  it("renders labeling summary table with control tags", () => {
    const annotations = [
      createMockAnnotation({
        versions: {
          result: [
            { from_name: "sentiment", to_name: "text", type: "choices", value: { choices: ["positive"] } },
            { from_name: "category", to_name: "text", type: "choices", value: { choices: ["news"] } },
          ],
        },
      }),
    ];
    const store = createMockStore({
      names: new Map([
        createMockControlTag("sentiment", "choices"),
        createMockControlTag("category", "choices"),
        createMockObjectTag("text"),
      ]),
    });

    renderWithQueryClient(<TaskSummary annotations={annotations} store={store} />);

    expect(screen.getByText("Annotator")).toBeInTheDocument();
    expect(screen.getByText("sentiment")).toBeInTheDocument();
    expect(screen.getByText("category")).toBeInTheDocument();
  });

  it("renders data summary table with object tags", () => {
    const annotations = [createMockAnnotation()];
    const store = createMockStore({
      store: {
        task: {
          dataObj: { text: "Sample text", image: "image.jpg" },
        },
      },
      names: new Map([
        createMockControlTag("label"),
        createMockObjectTag("text", "text"),
        createMockObjectTag("image", "image"),
      ]),
    });

    renderWithQueryClient(<TaskSummary annotations={annotations} store={store} />);

    // Object tags should appear in the data summary (as header and badge)
    expect(screen.getAllByText("text")).toHaveLength(2); // header + badge
    expect(screen.getAllByText("image")).toHaveLength(2); // header + badge
  });

  it("handles empty annotations array", () => {
    const annotations: MSTAnnotation[] = [];
    const store = createMockStore();

    renderWithQueryClient(<TaskSummary annotations={annotations} store={store} />);

    // Should show 0 for both annotations and predictions
    expect(screen.getByText("Annotations")).toBeInTheDocument();
    expect(screen.getByText("Predictions")).toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(2);
  });

  it("handles missing task agreement gracefully", () => {
    const annotations = [createMockAnnotation()];
    const store = createMockStore({
      store: {
        task: {
          agreement: undefined,
        },
        project: {
          review_settings: {
            show_agreement_to_reviewers: true,
          },
        },
      },
    });

    renderWithQueryClient(<TaskSummary annotations={annotations} store={store} />);

    // Should not display agreement when it's undefined
    expect(screen.queryByText("Agreement")).not.toBeInTheDocument();
  });

  it("processes control tags with per_region setting", () => {
    const annotations = [
      createMockAnnotation({
        versions: {
          result: [{ from_name: "regionLabel", to_name: "text", type: "choices", value: { choices: ["label1"] } }],
        },
      }),
    ];
    const controlWithPerRegion: [string, MockControlTag] = [
      "regionLabel",
      {
        isControlTag: true,
        type: "choices",
        toname: "text",
        perregion: true,
        children: [{ value: "label1", background: "#ff0000" }],
      },
    ];

    const store = createMockStore({
      names: new Map([controlWithPerRegion]),
    });

    renderWithQueryClient(<TaskSummary annotations={annotations} store={store} />);

    expect(screen.getByText("regionLabel")).toBeInTheDocument();
  });

  it("filters object tags correctly (only those with $ in value)", () => {
    const annotations = [createMockAnnotation()];
    const store = createMockStore({
      names: new Map([
        createMockControlTag("label"),
        createMockObjectTag("text", "text"), // has $ prefix - should be included
        ["invalidObject", { isObjectTag: true, value: "noDollarPrefix", type: "text" }], // no $ - should be excluded
        ["nonObject", { isObjectTag: false, value: "$text", type: "text" }], // not object tag - should be excluded
      ]),
    });

    renderWithQueryClient(<TaskSummary annotations={annotations} store={store} />);

    // Only valid object tags with $ prefix should appear (as header and badge)
    expect(screen.getAllByText("text")).toHaveLength(2); // header + badge
    expect(screen.queryByText("invalidObject")).not.toBeInTheDocument();
    expect(screen.queryByText("nonObject")).not.toBeInTheDocument();
  });

  describe("with FF_FIT_720_LAZY_LOAD_ANNOTATIONS enabled", () => {
    beforeEach(() => {
      window.APP_SETTINGS.feature_flags[FF_FIT_720_LAZY_LOAD_ANNOTATIONS] = true;
    });

    it("renders main headings when FF is on", () => {
      const annotations = [createMockAnnotation()];
      const store = createMockStore();

      renderWithProviders(<TaskSummary annotations={annotations} store={store} />);

      expect(screen.getByText("Task Summary")).toBeInTheDocument();
      expect(screen.getByText("Task Data")).toBeInTheDocument();
    });

    it("renders distribution row when FF is on", () => {
      const annotations = [createMockAnnotation()];
      const store = createMockStore();

      renderWithProviders(<TaskSummary annotations={annotations} store={store} />);

      expect(screen.getByText("Distribution")).toBeInTheDocument();
    });

    it("handles stub annotations correctly (shows skeleton)", () => {
      // Stub annotations have is_stub: true and no result
      const stubAnnotation = createMockAnnotation({
        id: "stub-1",
        pk: "stub-1",
        versions: {
          result: [], // Empty result indicates stub
        },
      });
      const store = createMockStore();

      renderWithProviders(<TaskSummary annotations={[stubAnnotation]} store={store} />);

      // Should still render the component without crashing
      expect(screen.getByText("Task Summary")).toBeInTheDocument();
      expect(screen.getByText("Annotations")).toBeInTheDocument();
    });

    it("counts annotations correctly with mixed stub and full annotations", () => {
      const annotations = [
        createMockAnnotation({ pk: "1", type: "annotation" }), // full annotation
        createMockAnnotation({ pk: "2", type: "annotation", versions: { result: [] } }), // stub annotation
        createMockAnnotation({ pk: "3", type: "annotation" }), // full annotation
      ];
      const store = createMockStore();

      renderWithProviders(<TaskSummary annotations={annotations} store={store} />);

      expect(screen.getByText("Annotations")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument(); // All annotations counted
    });

    it("renders labeling summary table with annotations when FF is on", () => {
      const annotations = [
        createMockAnnotation({
          versions: {
            result: [{ from_name: "label", to_name: "text", type: "choices", value: { choices: ["positive"] } }],
          },
        }),
      ];
      const store = createMockStore();

      renderWithProviders(<TaskSummary annotations={annotations} store={store} />);

      expect(screen.getByText("Annotator")).toBeInTheDocument();
      expect(screen.getByText("label")).toBeInTheDocument();
    });
  });
});
