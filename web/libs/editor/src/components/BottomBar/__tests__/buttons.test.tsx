import { render, fireEvent } from "@testing-library/react";
import { Provider } from "mobx-react";
import { SkipButton } from "../buttons";

jest.mock("@humansignal/ui", () => {
  const { forwardRef } = jest.requireActual("react");
  return {
    Button: forwardRef(({ children, disabled, tooltip, onClick, ...props }: any, ref: any) => {
      return (
        <button {...props} ref={ref} data-testid="skip-button" disabled={disabled} title={tooltip} onClick={onClick}>
          {children}
        </button>
      );
    }),
  };
});

const createMockStore = (overrides: any = {}) => ({
  task: { id: 1, allow_skip: true, ...overrides.task },
  skipTask: jest.fn(),
  hasInterface: jest.fn((name: string) => overrides.interfaces?.includes(name) ?? false),
  annotationStore: {
    selected: {
      submissionInProgress: jest.fn(),
    },
  },
  commentStore: {
    commentFormSubmit: jest.fn(),
  },
  ...overrides,
});

describe("SkipButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Skip button disabled when allow_skip=false", () => {
    const mockStore = createMockStore({
      task: { id: 1, allow_skip: false },
    });
    const onSkipWithComment = jest.fn();

    const { getByTestId } = render(
      <Provider store={mockStore}>
        <SkipButton disabled={false} store={mockStore as any} onSkipWithComment={onSkipWithComment} />
      </Provider>,
    );

    const button = getByTestId("skip-button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", "This task cannot be skipped");
  });

  test("Skip button enabled when allow_skip=true", () => {
    const mockStore = createMockStore({
      task: { id: 1, allow_skip: true },
    });
    const onSkipWithComment = jest.fn();

    const { getByTestId } = render(
      <Provider store={mockStore}>
        <SkipButton disabled={false} store={mockStore as any} onSkipWithComment={onSkipWithComment} />
      </Provider>,
    );

    const button = getByTestId("skip-button");
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute("title", "Cancel (skip) task [ Ctrl+Space ]");
  });

  test("Skip button enabled when allow_skip is undefined (default behavior)", () => {
    const mockStore = createMockStore({
      task: { id: 1 }, // no allow_skip property
    });
    const onSkipWithComment = jest.fn();

    const { getByTestId } = render(
      <Provider store={mockStore}>
        <SkipButton disabled={false} store={mockStore as any} onSkipWithComment={onSkipWithComment} />
      </Provider>,
    );

    const button = getByTestId("skip-button");
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute("title", "Cancel (skip) task [ Ctrl+Space ]");
  });

  test("Skip button enabled when allow_skip=null", () => {
    const mockStore = createMockStore({
      task: { id: 1, allow_skip: null },
    });
    const onSkipWithComment = jest.fn();

    const { getByTestId } = render(
      <Provider store={mockStore}>
        <SkipButton disabled={false} store={mockStore as any} onSkipWithComment={onSkipWithComment} />
      </Provider>,
    );

    const button = getByTestId("skip-button");
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute("title", "Cancel (skip) task [ Ctrl+Space ]");
  });

  test("Skip button onClick doesn't trigger when allow_skip=false", () => {
    const mockStore = createMockStore({
      task: { id: 1, allow_skip: false },
      interfaces: ["skip"],
    });
    const onSkipWithComment = jest.fn();

    const { getByTestId } = render(
      <Provider store={mockStore}>
        <SkipButton disabled={false} store={mockStore as any} onSkipWithComment={onSkipWithComment} />
      </Provider>,
    );

    const button = getByTestId("skip-button");
    fireEvent.click(button);

    expect(onSkipWithComment).not.toHaveBeenCalled();
    expect(mockStore.skipTask).not.toHaveBeenCalled();
  });

  test("Skip button onClick triggers when allow_skip=true", async () => {
    const mockStore = createMockStore({
      task: { id: 1, allow_skip: true },
      interfaces: ["skip", "comments:skip"],
    });
    const onSkipWithComment = jest.fn();

    const { getByTestId } = render(
      <Provider store={mockStore}>
        <SkipButton disabled={false} store={mockStore as any} onSkipWithComment={onSkipWithComment} />
      </Provider>,
    );

    const button = getByTestId("skip-button");
    fireEvent.click(button);

    expect(onSkipWithComment).toHaveBeenCalled();
  });

  test("Skip button respects other disabled conditions", () => {
    const mockStore = createMockStore({
      task: { id: 1, allow_skip: true },
    });
    const onSkipWithComment = jest.fn();

    const { getByTestId } = render(
      <Provider store={mockStore}>
        <SkipButton disabled={true} store={mockStore as any} onSkipWithComment={onSkipWithComment} />
      </Provider>,
    );

    const button = getByTestId("skip-button");
    expect(button).toBeDisabled();
  });
});
