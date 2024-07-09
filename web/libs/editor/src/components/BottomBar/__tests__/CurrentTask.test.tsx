import { render } from "@testing-library/react";
import { CurrentTask } from "../CurrentTask";
import { BlockContext, cn } from "../../../utils/bem.ts";
import { FF_LEAP_1173 } from "../../../utils/feature-flags";
import { mockFF } from "../../../../__mocks__/global";

const ff = mockFF();

describe("CurrentTask", () => {
  let store: any;

  beforeAll(() => {
    ff.setup();
    ff.set({
      [FF_LEAP_1173]: true,
    });
  });

  beforeEach(() => {
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
      task: { id: 6616 },
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
    // check if next-task is enabled
    store.hasInterface.mockImplementation((interfaceName: string) =>
      ["skip", "postpone", "topbar:prevnext", "topbar:task-counter"].includes(interfaceName),
    );

    const { rerender, getByTestId } = render(
      <BlockContext.Provider value={cn("block-name")}>
        <CurrentTask store={store} />
      </BlockContext.Provider>,
    );

    expect(getByTestId("next-task").disabled).toBe(false);

    // check if next-task is disabled removing the postpone interface
    store = {
      ...store,
      hasInterface: jest
        .fn()
        .mockImplementation((interfaceName: string) =>
          ["skip", "topbar:prevnext", "topbar:task-counter"].includes(interfaceName),
        ),
    };

    rerender(
      <BlockContext.Provider value={cn("block-name")}>
        <CurrentTask store={store} />
      </BlockContext.Provider>,
    );

    expect(getByTestId("next-task").disabled).toBe(true);

    // check if next-task is disabled removing the skip interface
    store = {
      ...store,
      hasInterface: jest
        .fn()
        .mockImplementation((interfaceName: string) =>
          ["postpone", "topbar:prevnext", "topbar:task-counter"].includes(interfaceName),
        ),
    };

    rerender(
      <BlockContext.Provider value={cn("block-name")}>
        <CurrentTask store={store} />
      </BlockContext.Provider>,
    );

    expect(getByTestId("next-task").disabled).toBe(true);

    // check if next-task is disabled removing both skip and postpone interface
    store = {
      ...store,
      hasInterface: jest
        .fn()
        .mockImplementation((interfaceName: string) =>
          ["topbar:prevnext", "topbar:task-counter"].includes(interfaceName),
        ),
    };

    rerender(
      <BlockContext.Provider value={cn("block-name")}>
        <CurrentTask store={store} />
      </BlockContext.Provider>,
    );

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

    rerender(
      <BlockContext.Provider value={cn("block-name")}>
        <CurrentTask store={store} />
      </BlockContext.Provider>,
    );

    expect(getByTestId("next-task").disabled).toBe(true);
  });
});
