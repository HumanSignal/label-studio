import { render } from "@testing-library/react";
import { CurrentTask } from "../CurrentTask";
import { FF_LEAP_1173 } from "../../../utils/feature-flags";
import { mockFF } from "../../../../__mocks__/global";

const ff = mockFF();

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

describe("CurrentTask", () => {
  let store: any;

  beforeAll(() => {
    ff.setup();
    ff.set({
      [FF_LEAP_1173]: true,
    });
  });

  beforeEach(() => {
    // Reset APP_SETTINGS before each test
    (window as any).APP_SETTINGS = undefined;
    // Initialize your store with default values
    store = {
      annotationStore: { selected: { pk: null } },
      canGoNextTask: false,
      canGoPrevTask: false,
      hasInterface: jest.fn(),
      taskHistory: [
        {
          taskId: 6627,
          annotationId: null,
        },
        {
          taskId: 6616,
          annotationId: null,
        },
      ],
      task: { id: 6616, allow_skip: true, allow_postpone: true },
      commentStore: {
        loading: "list",
        comments: [],
        setAddedCommentThisSession: jest.fn(),
      },
      queuePosition: 1,
      prevTask: jest.fn(),
      nextTask: jest.fn(),
      postponeTask: jest.fn(),
      queueTotal: 22,
    };
  });

  it("sets canPostpone correctly", () => {
    // check if next-task is enabled (when canPostpone is true)
    store.hasInterface.mockImplementation((interfaceName: string) =>
      ["skip", "postpone", "topbar:prevnext", "topbar:task-counter"].includes(interfaceName),
    );
    store.canGoNextTask = false; // Ensure canGoNextTask is false so postpone is the only option
    store.annotationStore.selected.pk = null; // No submitted annotation

    const { rerender, getByTestId } = render(<CurrentTask store={store} />);

    expect(getByTestId("next-task").disabled).toBe(false);

    // check if next-task is disabled removing the postpone interface
    store = {
      ...store,
      hasInterface: jest
        .fn()
        .mockImplementation((interfaceName: string) =>
          ["skip", "topbar:prevnext", "topbar:task-counter"].includes(interfaceName),
        ),
      canGoNextTask: false, // Ensure canGoNextTask is false
    };

    rerender(<CurrentTask store={store} />);

    expect(getByTestId("next-task").disabled).toBe(true);

    // check if next-task is disabled removing the skip interface
    // When skip interface is removed, canPostpone becomes false (FF_LEAP_1173 requires skip)
    // So button should be disabled unless canGoNextTask is true
    Object.assign(store, {
      hasInterface: jest
        .fn()
        .mockImplementation((interfaceName: string) =>
          ["postpone", "topbar:prevnext", "topbar:task-counter"].includes(interfaceName),
        ),
      canGoNextTask: false, // Ensure canGoNextTask is false for this test
    });
    store.annotationStore.selected.pk = null; // Ensure no submitted annotation

    rerender(<CurrentTask store={store} />);

    expect(getByTestId("next-task").disabled).toBe(true);

    // check if next-task is disabled removing both skip and postpone interface
    store = {
      ...store,
      hasInterface: jest
        .fn()
        .mockImplementation((interfaceName: string) =>
          ["topbar:prevnext", "topbar:task-counter"].includes(interfaceName),
        ),
      canGoNextTask: false, // Ensure canGoNextTask is false for this test
    };

    rerender(<CurrentTask store={store} />);

    expect(getByTestId("next-task").disabled).toBe(true);

    // check if next-task is disabled setting review interface
    store = {
      ...store,
      hasInterface: jest
        .fn()
        .mockImplementation((interfaceName: string) =>
          ["review", "skip", "postpone", "topbar:prevnext", "topbar:task-counter"].includes(interfaceName),
        ),
    };

    rerender(<CurrentTask store={store} />);

    expect(getByTestId("next-task").disabled).toBe(true);
  });

  it("does NOT disable postpone button when allow_skip=false in LSO (non-enterprise)", () => {
    // In LSO (non-enterprise), allow_skip field doesn't exist/affect behavior
    setupAppSettings({ enterprise: false });
    store.hasInterface.mockImplementation((interfaceName: string) =>
      ["skip", "postpone", "topbar:prevnext", "topbar:task-counter"].includes(interfaceName),
    );
    store.task = { id: 6616, allow_skip: false, allow_postpone: true };

    const { getByTestId } = render(<CurrentTask store={store} />);

    // In LSO, postpone button should NOT be disabled even when allow_skip=false
    expect(getByTestId("next-task").disabled).toBe(false);
  });

  it("disables postpone button when allow_skip=false in LSE (enterprise)", () => {
    setupAppSettings({ enterprise: true });
    store.hasInterface.mockImplementation((interfaceName: string) =>
      ["skip", "postpone", "topbar:prevnext", "topbar:task-counter"].includes(interfaceName),
    );
    store.task = { id: 6616, allow_skip: false, allow_postpone: true };

    const { getByTestId } = render(<CurrentTask store={store} />);

    expect(getByTestId("next-task").disabled).toBe(true);
  });

  it("enables postpone button when allow_skip=true in LSE (enterprise)", () => {
    setupAppSettings({ enterprise: true });
    store.hasInterface.mockImplementation((interfaceName: string) =>
      ["skip", "postpone", "topbar:prevnext", "topbar:task-counter"].includes(interfaceName),
    );
    store.task = { id: 6616, allow_skip: true, allow_postpone: true };

    const { getByTestId } = render(<CurrentTask store={store} />);

    expect(getByTestId("next-task").disabled).toBe(false);
  });

  it("enables postpone button when allow_skip is undefined", () => {
    store.hasInterface.mockImplementation((interfaceName: string) =>
      ["skip", "postpone", "topbar:prevnext", "topbar:task-counter"].includes(interfaceName),
    );
    store.task = { id: 6616, allow_postpone: true }; // no allow_skip property

    const { getByTestId } = render(<CurrentTask store={store} />);

    expect(getByTestId("next-task").disabled).toBe(false);
  });

  it("disables postpone button when both allow_skip=false and allow_postpone=false in LSE (enterprise)", () => {
    setupAppSettings({ enterprise: true });
    store.hasInterface.mockImplementation((interfaceName: string) =>
      ["skip", "postpone", "topbar:prevnext", "topbar:task-counter"].includes(interfaceName),
    );
    store.task = { id: 6616, allow_skip: false, allow_postpone: false };

    const { getByTestId } = render(<CurrentTask store={store} />);

    expect(getByTestId("next-task").disabled).toBe(true);
  });

  it("enables next button when canGoNextTask=true regardless of allow_skip (history navigation)", () => {
    store.hasInterface.mockImplementation((interfaceName: string) =>
      ["skip", "postpone", "topbar:prevnext", "topbar:task-counter"].includes(interfaceName),
    );
    store.task = { id: 6616, allow_skip: false, allow_postpone: true };
    store.canGoNextTask = true;
    // History navigation is allowed even for unskippable tasks if canGoNextTask is true
    // But we need to ensure annotation is submitted for non-managers
    store.annotationStore.selected.pk = "123"; // Submitted annotation

    const { getByTestId } = render(<CurrentTask store={store} />);

    expect(getByTestId("next-task").disabled).toBe(false);
  });

  // Role-based tests for LSE (enterprise) - OW=Owner, AD=Admin, MA=Manager can force-skip/postpone
  it("enables postpone button when allow_skip=false but user is Owner (OW) in LSE", () => {
    setupAppSettings({ role: "OW", enterprise: true });
    store.hasInterface.mockImplementation((interfaceName: string) =>
      ["skip", "postpone", "topbar:prevnext", "topbar:task-counter"].includes(interfaceName),
    );
    store.task = { id: 6616, allow_skip: false };

    const { getByTestId } = render(<CurrentTask store={store} />);

    expect(getByTestId("next-task").disabled).toBe(false);
  });

  it("enables postpone button when allow_skip=false but user is Manager (MA) in LSE", () => {
    setupAppSettings({ role: "MA", enterprise: true });
    store.hasInterface.mockImplementation((interfaceName: string) =>
      ["skip", "postpone", "topbar:prevnext", "topbar:task-counter"].includes(interfaceName),
    );
    store.task = { id: 6616, allow_skip: false };

    const { getByTestId } = render(<CurrentTask store={store} />);

    expect(getByTestId("next-task").disabled).toBe(false);
  });

  it("disables postpone button when allow_skip=false and user is Annotator (AN) in LSE", () => {
    setupAppSettings({ role: "AN", enterprise: true });
    store.hasInterface.mockImplementation((interfaceName: string) =>
      ["skip", "postpone", "topbar:prevnext", "topbar:task-counter"].includes(interfaceName),
    );
    store.task = { id: 6616, allow_skip: false };

    const { getByTestId } = render(<CurrentTask store={store} />);

    expect(getByTestId("next-task").disabled).toBe(true);
  });
});
