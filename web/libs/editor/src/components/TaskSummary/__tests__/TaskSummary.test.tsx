import { render, screen } from "@testing-library/react";
import type { MSTAnnotation, MSTStore } from "../../../stores/types";
import TaskSummary from "../TaskSummary";

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

// Mock global APP_SETTINGS for user context
Object.defineProperty(window, "APP_SETTINGS", {
  value: {
    user: {
      id: 1,
      displayName: "Test User",
    },
  },
  writable: true,
});

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
  });

  it("renders the main headings", () => {
    const annotations = [createMockAnnotation()];
    const store = createMockStore();

    render(<TaskSummary annotations={annotations} store={store} />);

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

    render(<TaskSummary annotations={annotations} store={store} />);

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

    render(<TaskSummary annotations={annotations} store={store} />);

    // Backend controls agreement visibility, so if we have a number, show it
    expect(screen.getByText("Agreement")).toBeInTheDocument();
    expect(screen.getByText("85.5%")).toBeInTheDocument();
  });

  it("shows agreement even when project is null", () => {
    const annotations = [createMockAnnotation()];
    const store = createMockStore({
      project: null,
    });

    render(<TaskSummary annotations={annotations} store={store} />);

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

    render(<TaskSummary annotations={annotations} store={store} />);

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

    render(<TaskSummary annotations={annotations} store={store} />);

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

    render(<TaskSummary annotations={annotations} store={store} />);

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

    render(<TaskSummary annotations={annotations} store={store} />);

    // Object tags should appear in the data summary (as header and badge)
    expect(screen.getAllByText("text")).toHaveLength(2); // header + badge
    expect(screen.getAllByText("image")).toHaveLength(2); // header + badge
  });

  it("handles empty annotations array", () => {
    const annotations: MSTAnnotation[] = [];
    const store = createMockStore();

    render(<TaskSummary annotations={annotations} store={store} />);

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

    render(<TaskSummary annotations={annotations} store={store} />);

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

    render(<TaskSummary annotations={annotations} store={store} />);

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

    render(<TaskSummary annotations={annotations} store={store} />);

    // Only valid object tags with $ prefix should appear (as header and badge)
    expect(screen.getAllByText("text")).toHaveLength(2); // header + badge
    expect(screen.queryByText("invalidObject")).not.toBeInTheDocument();
    expect(screen.queryByText("nonObject")).not.toBeInTheDocument();
  });
});
