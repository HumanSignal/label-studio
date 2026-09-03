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
    selectedHistory: null,
  },
  customButtons: new Map(),
  rejectAnnotation: mock(),
  handleCustomButton: mock(),
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
      // Preserve caller data-testid (e.g. bottombar-update-button); default only when absent.
      <button data-testid="button" {...props}>
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
    mockStore.customButtons = new Map();
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

  test("disables accept and reject in review when viewing submitted while a draft exists (FIT-2105)", () => {
    mockStore.hasInterface = (a: string) => a === "review" || a === "controls";

    const annotation = {
      ...mockAnnotation,
      canBeReviewed: true,
      draftSelected: false,
      versions: { draft: [{ id: "r1" }] },
      submissionInProgress: mock(),
      history: { canUndo: false },
    };
    mockStore.annotationStore.selectedHistory = null;
    mockStore.annotationStore.selected = annotation;

    const { getByLabelText } = render(
      <Provider store={mockStore}>
        <Controls annotation={annotation} />
      </Provider>,
    );

    expect(getByLabelText("accept-annotation")).toBeDisabled();
    expect(getByLabelText("reject-annotation")).toBeDisabled();
  });

  test("renders configured reject actions in one menu", async () => {
    mockStore.hasInterface = (name: string) => name === "review" || name === "controls";
    mockStore.customButtons = new Map([
      [
        "reject",
        [
          {
            id: "remove",
            name: "remove",
            title: "No Rework",
            description: "Reject without sending for rework",
            variant: "negative",
            look: "outlined",
            disabled: false,
            menu: true,
          },
          {
            id: "requeue-other",
            name: "redistribute",
            title: "Pass to Another Annotator",
            description: "Reject and send to a different annotator",
            variant: "negative",
            look: "outlined",
            disabled: false,
            menu: true,
          },
        ],
      ],
    ]);

    const annotation = {
      ...mockAnnotation,
      canBeReviewed: true,
      draftSelected: true,
      submissionInProgress: mock(),
      history: { canUndo: false },
    };
    mockStore.annotationStore.selected = annotation;

    const { getByTestId, queryByTestId } = render(
      <Provider store={mockStore}>
        <Controls annotation={annotation} />
      </Provider>,
    );

    fireEvent.click(getByTestId("bottombar-reject-menu"));
    await waitFor(() => expect(queryByTestId("bottombar-custom-remove-button")).toBeInTheDocument());
    expect(queryByTestId("bottombar-custom-redistribute-button")).toBeInTheDocument();

    expect(getByTestId("bottombar-custom-remove-button")).toHaveTextContent("Default");
    expect(getByTestId("bottombar-custom-redistribute-button")).not.toHaveTextContent("Default");

    // Menu rows carry the description inline instead of a tooltip.
    expect(getByTestId("bottombar-custom-redistribute-button").textContent).toBe(
      "Pass to Another AnnotatorReject and send to a different annotator",
    );

    fireEvent.click(getByTestId("bottombar-custom-redistribute-button"));
    await waitFor(() =>
      expect(mockStore.handleCustomButton).toHaveBeenCalledWith(expect.objectContaining({ name: "redistribute" })),
    );
  });

  test("the Reject trigger commits to the default action, not the first menu row", async () => {
    mockStore.hasInterface = (name: string) => name === "review" || name === "controls";
    mockStore.handleCustomButton = mock();
    mockStore.customButtons = new Map([
      [
        "reject",
        [
          {
            id: "requeue",
            name: "requeue",
            title: "Return to Annotator",
            description: "Reject and send back to the original annotator for rework",
            variant: "negative",
            look: "outlined",
            disabled: false,
            menu: true,
          },
          {
            id: "remove",
            name: "remove",
            title: "No Rework",
            description: "Reject without sending for rework",
            variant: "negative",
            look: "outlined",
            disabled: false,
            isPrimary: true,
            menu: true,
          },
        ],
      ],
    ]);

    const annotation = {
      ...mockAnnotation,
      canBeReviewed: true,
      draftSelected: true,
      submissionInProgress: mock(),
      history: { canUndo: false },
    };
    mockStore.annotationStore.selected = annotation;

    const { getByTestId } = render(
      <Provider store={mockStore}>
        <Controls annotation={annotation} />
      </Provider>,
    );

    fireEvent.click(getByTestId("bottombar-reject-button"));

    await waitFor(() =>
      expect(mockStore.handleCustomButton).toHaveBeenCalledWith(expect.objectContaining({ name: "remove" })),
    );

    fireEvent.click(getByTestId("bottombar-reject-menu"));
    await waitFor(() => expect(getByTestId("bottombar-custom-remove-button")).toBeInTheDocument());
    expect(getByTestId("bottombar-custom-remove-button")).toHaveTextContent("Default");
    expect(getByTestId("bottombar-custom-requeue-button")).not.toHaveTextContent("Default");
  });

  test("keeps Update enabled when viewing submitted while a draft exists (BROS-1477 QA 93973)", () => {
    mockStore.hasInterface = (a: string) => a === "update" || a === "controls";
    mockStore.updateAnnotation = mock();
    mockStore.commentStore.commentFormSubmit = mock(() => Promise.resolve());

    const annotation = {
      ...mockAnnotation,
      userGenerate: false,
      draftSelected: false,
      draftId: 99,
      versions: { draft: [{ id: "r1" }], result: [{ id: "s1" }] },
      submissionInProgress: mock(),
    };
    mockStore.annotationStore.selectedHistory = null;
    mockStore.annotationStore.selected = annotation;
    mockHistory.canUndo = true;

    const { getByTestId } = render(
      <Provider store={mockStore}>
        <Controls history={mockHistory} annotation={annotation} />
      </Provider>,
    );

    expect(getByTestId("bottombar-update-button")).not.toBeDisabled();
  });

  test("disables Update when a non-live history item is selected", () => {
    mockStore.hasInterface = (a: string) => a === "update" || a === "controls";
    mockStore.updateAnnotation = mock();

    const annotation = {
      ...mockAnnotation,
      userGenerate: false,
      draftSelected: false,
      draftId: 99,
      versions: { draft: [{ id: "r1" }], result: [{ id: "s1" }] },
      submissionInProgress: mock(),
    };
    mockStore.annotationStore.selectedHistory = { id: "hist-1" };
    mockStore.annotationStore.selected = annotation;
    mockHistory.canUndo = true;

    const { getByTestId } = render(
      <Provider store={mockStore}>
        <Controls history={mockHistory} annotation={annotation} />
      </Provider>,
    );

    expect(getByTestId("bottombar-update-button")).toBeDisabled();
  });

  test("keeps accept and reject enabled in review when draft is the active view (FIT-2105)", () => {
    mockStore.hasInterface = (a: string) => a === "review" || a === "controls";

    const annotation = {
      ...mockAnnotation,
      canBeReviewed: true,
      draftSelected: true,
      versions: { draft: [{ id: "r1" }] },
      submissionInProgress: mock(),
      history: { canUndo: true },
    };
    mockStore.annotationStore.selectedHistory = null;
    mockStore.annotationStore.selected = annotation;

    const { getByLabelText } = render(
      <Provider store={mockStore}>
        <Controls annotation={annotation} />
      </Provider>,
    );

    expect(getByLabelText("accept-annotation")).not.toBeDisabled();
    expect(getByLabelText("reject-annotation")).not.toBeDisabled();
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
