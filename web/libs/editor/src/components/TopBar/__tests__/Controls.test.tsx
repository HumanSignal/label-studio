import { render, fireEvent } from "@testing-library/react";
import { Provider } from "mobx-react";
import { Controls } from "../Controls";

jest.mock("@humansignal/ui", () => {
  const { forwardRef } = jest.requireActual("react");
  return {
    Button: forwardRef(({ children, disabled, ...props }: any, ref: any) => {
      return (
        <button {...props} ref={ref} data-testid="button" disabled={disabled}>
          {children}
        </button>
      );
    }),
    Tooltip: ({ children, title }: any) => {
      return (
        <div data-testid="tooltip" title={title}>
          {children}
        </div>
      );
    },
  };
});

const createMockStore = (overrides: any = {}) => ({
  task: { id: 1, allow_skip: true, ...overrides.task },
  skipTask: jest.fn(),
  isSubmitting: false,
  settings: {
    enableTooltips: true,
    ...overrides.settings,
  },
  hasInterface: jest.fn((name: string) => overrides.interfaces?.includes(name) ?? false),
  annotationStore: {
    selectedHistory: undefined,
    selected: {
      history: {
        canUndo: false,
      },
    },
    ...overrides.annotationStore,
  },
  commentStore: {
    commentFormSubmit: jest.fn(),
    addedCommentThisSession: false,
    currentComment: {},
    inputRef: { current: null },
    setTooltipMessage: jest.fn(),
    ...overrides.commentStore,
  },
  rejectAnnotation: jest.fn(),
  ...overrides,
});

// Helper to set up window.APP_SETTINGS for role-based and enterprise tests
const setupAppSettings = (options: { role?: string; enterprise?: boolean } = {}) => {
  (window as any).APP_SETTINGS = {
    user: {
      role: options.role,
    },
    billing: {
      enterprise: options.enterprise ?? false,
    },
  };
};

describe("TopBar Controls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset APP_SETTINGS before each test
    (window as any).APP_SETTINGS = undefined;
  });

  test("Skip button NOT disabled when allow_skip=false in LSO (non-enterprise)", () => {
    // In LSO (non-enterprise), allow_skip field doesn't exist/affect behavior
    setupAppSettings({ enterprise: false });
    const mockStore = createMockStore({
      task: { id: 1, allow_skip: false },
      interfaces: ["skip"],
    });
    const annotation = {
      id: "test",
      skipped: false,
      userGenerate: false,
      sentUserGenerate: false,
      versions: {},
      results: [],
      editable: true,
    };

    const { getByLabelText } = render(
      <Provider store={mockStore}>
        <Controls store={mockStore as any} annotation={annotation} />
      </Provider>,
    );

    const skipButton = getByLabelText("Skip current task");
    // In LSO, skip button should NOT be disabled even when allow_skip=false
    expect(skipButton).not.toBeDisabled();

    const tooltip = skipButton.closest('[data-testid="tooltip"]');
    expect(tooltip).toHaveAttribute("title", "Cancel (skip) task: [ Ctrl+Space ]");
  });

  test("Skip button disabled when allow_skip=false in LSE (enterprise)", () => {
    setupAppSettings({ enterprise: true });
    const mockStore = createMockStore({
      task: { id: 1, allow_skip: false },
      interfaces: ["skip"],
    });
    const annotation = {
      id: "test",
      skipped: false,
      userGenerate: false,
      sentUserGenerate: false,
      versions: {},
      results: [],
      editable: true,
    };

    const { getByLabelText } = render(
      <Provider store={mockStore}>
        <Controls store={mockStore as any} annotation={annotation} />
      </Provider>,
    );

    const skipButton = getByLabelText("Skip current task");
    expect(skipButton).toBeDisabled();

    const tooltip = skipButton.closest('[data-testid="tooltip"]');
    expect(tooltip).toHaveAttribute("title", "This task cannot be skipped");
  });

  test("Skip button enabled when allow_skip=true in LSE (enterprise)", () => {
    setupAppSettings({ enterprise: true });
    const mockStore = createMockStore({
      task: { id: 1, allow_skip: true },
      interfaces: ["skip"],
    });
    const annotation = {
      id: "test",
      skipped: false,
      userGenerate: false,
      sentUserGenerate: false,
      versions: {},
      results: [],
      editable: true,
    };

    const { getByLabelText } = render(
      <Provider store={mockStore}>
        <Controls store={mockStore as any} annotation={annotation} />
      </Provider>,
    );

    const skipButton = getByLabelText("Skip current task");
    expect(skipButton).not.toBeDisabled();

    const tooltip = skipButton.closest('[data-testid="tooltip"]');
    expect(tooltip).toHaveAttribute("title", "Cancel (skip) task: [ Ctrl+Space ]");
  });

  test("Skip action blocked when allow_skip=false in LSE (enterprise)", () => {
    setupAppSettings({ enterprise: true });
    const mockStore = createMockStore({
      task: { id: 1, allow_skip: false },
      interfaces: ["skip"],
    });
    const annotation = {
      id: "test",
      skipped: false,
      userGenerate: false,
      sentUserGenerate: false,
      versions: {},
      results: [],
      editable: true,
    };

    const { getByLabelText } = render(
      <Provider store={mockStore}>
        <Controls store={mockStore as any} annotation={annotation} />
      </Provider>,
    );

    const skipButton = getByLabelText("Skip current task");
    fireEvent.click(skipButton);

    expect(mockStore.skipTask).not.toHaveBeenCalled();
  });

  // Role-based tests for LSE (enterprise) - OW=Owner, AD=Admin, MA=Manager can force-skip
  test("Skip button enabled when allow_skip=false but user is Owner (OW) in LSE", () => {
    setupAppSettings({ role: "OW", enterprise: true });
    const mockStore = createMockStore({
      task: { id: 1, allow_skip: false },
      interfaces: ["skip"],
    });
    const annotation = {
      id: "test",
      skipped: false,
      userGenerate: false,
      sentUserGenerate: false,
      versions: {},
      results: [],
      editable: true,
    };

    const { getByLabelText } = render(
      <Provider store={mockStore}>
        <Controls store={mockStore as any} annotation={annotation} />
      </Provider>,
    );

    const skipButton = getByLabelText("Skip current task");
    expect(skipButton).not.toBeDisabled();

    const tooltip = skipButton.closest('[data-testid="tooltip"]');
    expect(tooltip).toHaveAttribute("title", "Cancel (skip) task: [ Ctrl+Space ]");
  });

  test("Skip button enabled when allow_skip=false but user is Manager (MA) in LSE", () => {
    setupAppSettings({ role: "MA", enterprise: true });
    const mockStore = createMockStore({
      task: { id: 1, allow_skip: false },
      interfaces: ["skip"],
    });
    const annotation = {
      id: "test",
      skipped: false,
      userGenerate: false,
      sentUserGenerate: false,
      versions: {},
      results: [],
      editable: true,
    };

    const { getByLabelText } = render(
      <Provider store={mockStore}>
        <Controls store={mockStore as any} annotation={annotation} />
      </Provider>,
    );

    const skipButton = getByLabelText("Skip current task");
    expect(skipButton).not.toBeDisabled();
  });

  test("Skip button disabled when allow_skip=false and user is Annotator (AN) in LSE", () => {
    setupAppSettings({ role: "AN", enterprise: true });
    const mockStore = createMockStore({
      task: { id: 1, allow_skip: false },
      interfaces: ["skip"],
    });
    const annotation = {
      id: "test",
      skipped: false,
      userGenerate: false,
      sentUserGenerate: false,
      versions: {},
      results: [],
      editable: true,
    };

    const { getByLabelText } = render(
      <Provider store={mockStore}>
        <Controls store={mockStore as any} annotation={annotation} />
      </Provider>,
    );

    const skipButton = getByLabelText("Skip current task");
    expect(skipButton).toBeDisabled();
  });
});
