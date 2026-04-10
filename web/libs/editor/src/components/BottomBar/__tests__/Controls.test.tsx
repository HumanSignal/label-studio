import { render, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "mobx-react";
import * as uiModule from "@humansignal/ui";
import { Controls } from "../Controls";
const mockStore = {
  hasInterface: mock(),
  isSubmitting: false,
  overlapReached: false,
  settings: {
    enableTooltips: true,
  },
  task: { id: 1, allow_skip: true },
  skipTask: mock(),
  commentStore: {
    currentComment: {
      a3r0fa: "It's working",
      a0lsuf: "It's working fine",
    },
    commentFormSubmit: mock(),
    setTooltipMessage: mock(),
  },
  annotationStore: {
    selected: {
      submissionInProgress: mock(),
      history: {
        canUndo: false,
      },
    },
  },
  customButtons: new Map(),
};

const mockHistory = {
  canUndo: false,
};

const mockAnnotation = {
  id: "a31wsd",
  canBeReviewed: false,
  userGenerate: false,
  sentUserGenerate: false,
  versions: {},
  results: [],
  editable: true,
};

// Helper to set up window.APP_SETTINGS for enterprise and role-based tests
const setupAppSettings = (options: { role?: string; enterprise?: boolean } = {}) => {
  (window as any).APP_SETTINGS = {
    user: {
      id: 999,
      role: options.role,
    },
    billing: {
      enterprise: options.enterprise ?? false,
    },
  };
};

describe("Controls", () => {
  beforeEach(() => {
    mock.clearAllMocks();
    spyOn(uiModule, "Button").mockImplementation(({ children, ...props }: any) => (
      <button {...props} data-testid="button">
        {children}
      </button>
    ));
    spyOn(uiModule, "Tooltip").mockImplementation(({ children }: any) => <div data-testid="tooltip">{children}</div>);
    spyOn(uiModule, "Userpic").mockImplementation(({ children }: any) => (
      <div
        data-testid="userpic"
        className="userpic--tBKCQ"
        style={{ background: "rgb(155, 166, 211)", color: "rgb(0, 0, 0)" }}
      >
        {children}
      </div>
    ));
    (window as any).APP_SETTINGS = undefined;
    mockStore.task = { id: 1, allow_skip: true };
  });

  test("When skip button is clicked, if there is no currentComment and annotators must leave a comment on skip, it must not submit and setToolTipMessage", () => {
    mockStore.hasInterface = (a: string) => (a === "skip" || a === "comments:skip") ?? true;

    const { getByLabelText } = render(
      <Provider store={mockStore}>
        <Controls history={mockHistory} annotation={mockAnnotation} />
      </Provider>,
    );

    const skipTask = getByLabelText("skip-task");
    fireEvent.click(skipTask);

    expect(mockStore.skipTask).not.toHaveBeenCalled();
    expect(mockStore.commentStore.commentFormSubmit).not.toHaveBeenCalled();
    expect(mockStore.commentStore.setTooltipMessage).toHaveBeenCalledWith("Please enter a comment before skipping");
  });

  test("When skip button is clicked, but there is an empty message on currentComment and annotators must leave a comment on skip, it must not submit and setToolTipMessage", () => {
    mockStore.hasInterface = (a: string) => (a === "skip" || a === "comments:skip") ?? true;
    mockStore.commentStore.currentComment.a31wsd = "   ";

    const { getByLabelText } = render(
      <Provider store={mockStore}>
        <Controls history={mockHistory} annotation={mockAnnotation} />
      </Provider>,
    );

    const skipTask = getByLabelText("skip-task");
    fireEvent.click(skipTask);

    expect(mockStore.skipTask).not.toHaveBeenCalled();
    expect(mockStore.commentStore.commentFormSubmit).not.toHaveBeenCalled();
    expect(mockStore.commentStore.setTooltipMessage).toHaveBeenCalledWith("Please enter a comment before skipping");
  });

  test("When skip button is clicked, if there is no currentComment and annotators doesn't need to leave a comment on skip, it must submit", async () => {
    mockStore.hasInterface = (a: string) => a === "skip";

    const { getByLabelText } = render(
      <Provider store={mockStore}>
        <Controls history={mockHistory} annotation={mockAnnotation} />
      </Provider>,
    );

    const skipTask = getByLabelText("skip-task");
    fireEvent.click(skipTask);

    await expect(mockStore.commentStore.commentFormSubmit).toHaveBeenCalled();
    expect(mockStore.skipTask).toHaveBeenCalled();
  });

  test("Skip button NOT disabled when allow_skip=false in LSO (non-enterprise)", () => {
    // In LSO (non-enterprise), allow_skip field doesn't exist/affect behavior
    setupAppSettings({ enterprise: false });
    mockStore.hasInterface = (a: string) => a === "skip";
    mockStore.task = { id: 1, allow_skip: false };

    const { getByLabelText } = render(
      <Provider store={mockStore}>
        <Controls history={mockHistory} annotation={mockAnnotation} />
      </Provider>,
    );

    const skipTask = getByLabelText("skip-task");
    // In LSO, skip button should NOT be disabled even when allow_skip=false
    expect(skipTask).not.toBeDisabled();
  });

  test("Skip button disabled when allow_skip=false in LSE (enterprise)", () => {
    setupAppSettings({ enterprise: true });
    mockStore.hasInterface = (a: string) => a === "skip";
    mockStore.task = { id: 1, allow_skip: false };

    const { getByLabelText } = render(
      <Provider store={mockStore}>
        <Controls history={mockHistory} annotation={mockAnnotation} />
      </Provider>,
    );

    const skipTask = getByLabelText("skip-task");
    expect(skipTask).toBeDisabled();
  });

  test("Skip button enabled when allow_skip=true in LSE (enterprise)", () => {
    setupAppSettings({ enterprise: true });
    mockStore.hasInterface = (a: string) => a === "skip";
    mockStore.task = { id: 1, allow_skip: true };

    const { getByLabelText } = render(
      <Provider store={mockStore}>
        <Controls history={mockHistory} annotation={mockAnnotation} />
      </Provider>,
    );

    const skipTask = getByLabelText("skip-task");
    expect(skipTask).not.toBeDisabled();
  });

  test("Skip action blocked when allow_skip=false in LSE (enterprise)", () => {
    setupAppSettings({ enterprise: true });
    mockStore.hasInterface = (a: string) => a === "skip";
    mockStore.task = { id: 1, allow_skip: false };
    mockStore.skipTask.mockClear();

    const { getByLabelText } = render(
      <Provider store={mockStore}>
        <Controls history={mockHistory} annotation={mockAnnotation} />
      </Provider>,
    );

    const skipTask = getByLabelText("skip-task");
    fireEvent.click(skipTask);

    expect(mockStore.skipTask).not.toHaveBeenCalled();
  });

  test("Skip button enabled when allow_skip=false but user is Owner (OW) in LSE", () => {
    setupAppSettings({ role: "OW", enterprise: true });
    mockStore.hasInterface = (a: string) => a === "skip";
    mockStore.task = { id: 1, allow_skip: false };

    const { getByLabelText } = render(
      <Provider store={mockStore}>
        <Controls history={mockHistory} annotation={mockAnnotation} />
      </Provider>,
    );

    expect(getByLabelText("skip-task")).not.toBeDisabled();
  });

  test("Skip button enabled when allow_skip=false but user is Manager (MA) in LSE", () => {
    setupAppSettings({ role: "MA", enterprise: true });
    mockStore.hasInterface = (a: string) => a === "skip";
    mockStore.task = { id: 1, allow_skip: false };

    const { getByLabelText } = render(
      <Provider store={mockStore}>
        <Controls history={mockHistory} annotation={mockAnnotation} />
      </Provider>,
    );

    expect(getByLabelText("skip-task")).not.toBeDisabled();
  });

  test("Skip button disabled when allow_skip=false and user is Annotator (AN) in LSE", () => {
    setupAppSettings({ role: "AN", enterprise: true });
    mockStore.hasInterface = (a: string) => a === "skip";
    mockStore.task = { id: 1, allow_skip: false };

    const { getByLabelText } = render(
      <Provider store={mockStore}>
        <Controls history={mockHistory} annotation={mockAnnotation} />
      </Provider>,
    );

    expect(getByLabelText("skip-task")).toBeDisabled();
  });

  test("Skip triggers skipTask when allow_skip=false but user is Manager (MA) in LSE", async () => {
    setupAppSettings({ role: "MA", enterprise: true });
    mockStore.hasInterface = (a: string) => a === "skip";
    mockStore.task = { id: 1, allow_skip: false };
    mockStore.skipTask.mockClear();
    mockStore.commentStore.commentFormSubmit = mock(() => Promise.resolve());

    const { getByLabelText } = render(
      <Provider store={mockStore}>
        <Controls history={mockHistory} annotation={mockAnnotation} />
      </Provider>,
    );

    fireEvent.click(getByLabelText("skip-task"));

    await waitFor(() => {
      expect(mockStore.skipTask).toHaveBeenCalled();
    });
  });
});
