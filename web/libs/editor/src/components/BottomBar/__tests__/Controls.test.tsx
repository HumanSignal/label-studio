import { render, fireEvent } from "@testing-library/react";
import { Provider } from "mobx-react";
import { Controls } from "../Controls";

const mockStore = {
  hasInterface: jest.fn(),
  isSubmitting: false,
  settings: {
    enableTooltips: true,
  },
  skipTask: jest.fn(),
  commentStore: {
    currentComment: {
      a3r0fa: "It's working",
      a0lsuf: "It's working fine",
    },
    commentFormSubmit: jest.fn(),
    setTooltipMessage: jest.fn(),
  },
  annotationStore: {
    selected: {
      submissionInProgress: jest.fn(),
      history: {
        canUndo: false,
      },
    },
  },
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

describe("Controls", () => {
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
    mockStore.hasInterface = (a: string) => a === "skip" ?? true;
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
});
