import { render, fireEvent } from "@testing-library/react";
import { Provider } from "mobx-react";
import Controls from "../Controls";

jest.mock("@humansignal/ui", () => {
  const { forwardRef } = jest.requireActual("react");
  return {
    Button: forwardRef(({ children, disabled, tooltip, onClick, ...props }: any, ref: any) => {
      return (
        <button {...props} ref={ref} data-testid="button" disabled={disabled} title={tooltip} onClick={onClick}>
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

jest.mock("@humansignal/icons", () => ({
  IconInfoOutline: ({ width, height, className }: any) => (
    <svg data-testid="info-icon" width={width} height={height} className={className} />
  ),
}));

const createMockStore = (overrides: any = {}) => ({
  task: { id: 1, allow_skip: true, ...overrides.task },
  skipTask: jest.fn(),
  isSubmitting: false,
  hasInterface: jest.fn((name: string) => overrides.interfaces?.includes(name) ?? false),
  settings: {
    enableHotkeys: true,
    enableTooltips: true,
  },
  annotationStore: {
    predictSelect: null,
  },
  explore: true, // Set to true so component renders
  ...overrides,
});

// Helper to set up window.APP_SETTINGS for role-based tests
const setupAppSettings = (role?: string) => {
  (window as any).APP_SETTINGS = {
    user: {
      role,
    },
  };
};

describe("Controls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset APP_SETTINGS before each test
    (window as any).APP_SETTINGS = undefined;
  });

  test("Skip button disabled when allow_skip=false", () => {
    const mockStore = createMockStore({
      task: { id: 1, allow_skip: false },
      interfaces: ["skip"],
    });
    const item = {
      userGenerate: false,
      sentUserGenerate: false,
      versions: {},
    };

    const { container, getByText } = render(
      <Provider store={mockStore}>
        <Controls store={mockStore as any} item={item} />
      </Provider>,
    );

    const skipButton = getByText(/Skip/i).closest("button");
    expect(skipButton).toBeDisabled();
    expect(skipButton).toHaveAttribute("title", "This task cannot be skipped");
  });

  test("Skip button enabled when allow_skip=true", () => {
    const mockStore = createMockStore({
      task: { id: 1, allow_skip: true },
      interfaces: ["skip"],
    });
    const item = {
      userGenerate: false,
      sentUserGenerate: false,
      versions: {},
    };

    const { getByText } = render(
      <Provider store={mockStore}>
        <Controls store={mockStore as any} item={item} />
      </Provider>,
    );

    const skipButton = getByText(/Skip/i).closest("button");
    expect(skipButton).not.toBeDisabled();
    expect(skipButton).toHaveAttribute("title", "Cancel (skip) task: [ Ctrl+Space ]");
  });

  test("Skip button onClick is undefined when allow_skip=false", () => {
    const mockStore = createMockStore({
      task: { id: 1, allow_skip: false },
      interfaces: ["skip"],
    });
    const item = {
      userGenerate: false,
      sentUserGenerate: false,
      versions: {},
    };

    const { getByText } = render(
      <Provider store={mockStore}>
        <Controls store={mockStore as any} item={item} />
      </Provider>,
    );

    const skipButton = getByText(/Skip/i).closest("button");
    expect(skipButton).toBeDisabled();
    // When disabled and onClick is undefined, clicking should not trigger skipTask
    fireEvent.click(skipButton!);
    expect(mockStore.skipTask).not.toHaveBeenCalled();
  });

  test("Skip button onClick triggers skipTask when allow_skip=true", () => {
    const mockStore = createMockStore({
      task: { id: 1, allow_skip: true },
      interfaces: ["skip"],
    });
    const item = {
      userGenerate: false,
      sentUserGenerate: false,
      versions: {},
    };

    const { getByText } = render(
      <Provider store={mockStore}>
        <Controls store={mockStore as any} item={item} />
      </Provider>,
    );

    const skipButton = getByText(/Skip/i).closest("button");
    fireEvent.click(skipButton!);

    expect(mockStore.skipTask).toHaveBeenCalled();
  });

  // Role-based tests (OW=Owner, AD=Admin, MA=Manager can force-skip)
  test("Skip button enabled when allow_skip=false but user is Owner (OW)", () => {
    setupAppSettings("OW");
    const mockStore = createMockStore({
      task: { id: 1, allow_skip: false },
      interfaces: ["skip"],
    });
    const item = {
      userGenerate: false,
      sentUserGenerate: false,
      versions: {},
    };

    const { getByText } = render(
      <Provider store={mockStore}>
        <Controls store={mockStore as any} item={item} />
      </Provider>,
    );

    const skipButton = getByText(/Skip/i).closest("button");
    expect(skipButton).not.toBeDisabled();
    expect(skipButton).toHaveAttribute("title", "Cancel (skip) task: [ Ctrl+Space ]");
  });

  test("Skip button enabled when allow_skip=false but user is Manager (MA)", () => {
    setupAppSettings("MA");
    const mockStore = createMockStore({
      task: { id: 1, allow_skip: false },
      interfaces: ["skip"],
    });
    const item = {
      userGenerate: false,
      sentUserGenerate: false,
      versions: {},
    };

    const { getByText } = render(
      <Provider store={mockStore}>
        <Controls store={mockStore as any} item={item} />
      </Provider>,
    );

    const skipButton = getByText(/Skip/i).closest("button");
    expect(skipButton).not.toBeDisabled();
  });

  test("Skip button disabled when allow_skip=false and user is Annotator (AN)", () => {
    setupAppSettings("AN");
    const mockStore = createMockStore({
      task: { id: 1, allow_skip: false },
      interfaces: ["skip"],
    });
    const item = {
      userGenerate: false,
      sentUserGenerate: false,
      versions: {},
    };

    const { getByText } = render(
      <Provider store={mockStore}>
        <Controls store={mockStore as any} item={item} />
      </Provider>,
    );

    const skipButton = getByText(/Skip/i).closest("button");
    expect(skipButton).toBeDisabled();
  });

  test("Skip button onClick triggers skipTask when allow_skip=false but user is Manager", () => {
    setupAppSettings("MA");
    const mockStore = createMockStore({
      task: { id: 1, allow_skip: false },
      interfaces: ["skip"],
    });
    const item = {
      userGenerate: false,
      sentUserGenerate: false,
      versions: {},
    };

    const { getByText } = render(
      <Provider store={mockStore}>
        <Controls store={mockStore as any} item={item} />
      </Provider>,
    );

    const skipButton = getByText(/Skip/i).closest("button");
    fireEvent.click(skipButton!);

    expect(mockStore.skipTask).toHaveBeenCalled();
  });
});
