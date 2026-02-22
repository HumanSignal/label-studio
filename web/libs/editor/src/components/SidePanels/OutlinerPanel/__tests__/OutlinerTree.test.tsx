import { render, screen, waitFor } from "@testing-library/react";
import { OutlinerTree } from "../OutlinerTree";

const mockObserve = jest.fn();
const mockUnobserve = jest.fn();
const mockDisconnect = jest.fn();

beforeAll(() => {
  (global as any).ResizeObserver = class ResizeObserver {
    observe = mockObserve;
    unobserve = mockUnobserve;
    disconnect = mockDisconnect;
    constructor(callback: (entries: Array<{ contentRect: { height: number } }>) => void) {
      queueMicrotask(() => {
        callback([{ contentRect: { height: 400 } }]);
      });
    }
  };
});

beforeEach(() => {
  mockObserve.mockClear();
  mockUnobserve.mockClear();
  mockDisconnect.mockClear();
});

jest.mock("../../../../utils/bem", () => ({
  cn: (block: string) => ({
    elem: (elem: string) => ({
      mod: (mods: Record<string, unknown>) => ({
        toClassName: () => `dm-${block}__${elem}`,
      }),
      toClassName: () => `dm-${block}__${elem}`,
    }),
    mod: () => ({
      toClassName: () => `dm-${block}`,
    }),
    toClassName: () => `dm-${block}`,
  }),
}));

jest.mock("../../../../utils/feature-flags", () => ({
  isFF: () => false,
  FF_DEV_2755: "ff_dev_2755",
}));

jest.mock("../../../../core/Registry", () => ({
  __esModule: true,
  default: {
    getPerRegionView: () => null,
  },
}));

jest.mock("chroma-js", () => ({
  __esModule: true,
  default: (style: string) => {
    const c = style ?? "#666";
    const chain = {
      css: () => c,
      alpha: () => chain,
    };
    return chain;
  },
}));

jest.mock("../RegionLabel", () => ({
  RegionLabel: ({ item }: { item: { type?: string } }) => (
    <span data-testid="region-label">{item?.type ?? "No Label"}</span>
  ),
}));

jest.mock("../../../Node/Node", () => ({
  NodeIcon: () => <span data-testid="node-icon" />,
}));

jest.mock("../../Components/LockButton", () => ({
  LockButton: () => <span data-testid="lock-button" />,
}));

jest.mock("../../Components/RegionContextMenu", () => ({
  RegionContextMenu: () => <span data-testid="region-context-menu" />,
}));

jest.mock("../../Components/RegionControlButton", () => ({
  RegionControlButton: ({ children, ...props }: any) => (
    <button type="button" data-testid="region-control-button" {...props}>
      {children}
    </button>
  ),
}));

jest.mock("@humansignal/ui", () => ({
  Tooltip: ({ children }: any) => <span data-testid="tooltip">{children}</span>,
}));

jest.mock("@humansignal/icons", () => ({
  IconArrow: () => <span data-testid="icon-arrow" />,
  IconChevronLeft: () => <span data-testid="icon-chevron-left" />,
  IconEyeClosed: () => <span data-testid="icon-eye-closed" />,
  IconEyeOpened: () => <span data-testid="icon-eye-opened" />,
  IconSparks: () => <span data-testid="icon-sparks" />,
  IconWarning: () => <span data-testid="icon-warning" />,
}));

jest.mock("mobx-react", () => {
  const React = require("react");
  const observer = (C: any) => C;
  const inject = () => (C: any) => (props: any) =>
    React.createElement(C, { ...props, store: { hasInterface: () => false } });
  return { observer, inject };
});

jest.mock("../../../../utils/resize-observer", () => {
  return {
    __esModule: true,
    default: class ResizeObserver {
      observe = mockObserve;
      unobserve = mockUnobserve;
      disconnect = mockDisconnect;
      constructor(callback: (entries: Array<{ contentRect: { height: number } }>) => void) {
        queueMicrotask(() => {
          callback([{ contentRect: { height: 400 } }]);
        });
      }
    },
  };
});

function createMockRegions(overrides: Record<string, unknown> = {}) {
  return {
    group: "manual",
    selection: { keys: [] as string[] },
    getRegionsTree: (processor: (item: any, idx: number) => any) => {
      const items = [
        {
          id: "r1",
          type: "rectangle",
          getOneColor: () => "#3366ff",
          hidden: false,
          isDrawing: false,
          locked: false,
          incomplete: false,
          annotation: null,
          selected: false,
          setHighlight: jest.fn(),
          isReadOnly: () => false,
          hideable: true,
          highlighted: false,
          toggleHidden: jest.fn(),
          setLocked: jest.fn(),
          origin: undefined,
          score: undefined,
          text: undefined,
          perRegionDescControls: [],
          onSelectInOutliner: undefined,
          labeling: undefined,
        },
      ];
      const tree = items.map((item, idx) => {
        const result = processor(item, idx, false, null, undefined);
        return {
          ...result,
          item,
          children: [],
          isArea: true,
        };
      });
      return tree;
    },
    ...overrides,
  };
}

describe("OutlinerTree", () => {
  it("renders tree container and tree when regions provide getRegionsTree", async () => {
    const regions = createMockRegions();
    const { container } = render(<OutlinerTree regions={regions} footer={null} />);

    await waitFor(() => {
      expect(container.querySelector(".dm-outliner-tree")).toBeInTheDocument();
    });
  });

  it("renders footer when footer prop is provided", async () => {
    const regions = createMockRegions();
    const footer = <div data-testid="outliner-footer">Footer content</div>;
    render(<OutlinerTree regions={regions} footer={footer} />);

    await waitFor(() => {
      expect(screen.getByTestId("outliner-footer")).toHaveTextContent("Footer content");
    });
  });

  it("uses ResizeObserver and sets height so Tree is rendered", async () => {
    const regions = createMockRegions();
    render(<OutlinerTree regions={regions} footer={null} />);

    await waitFor(() => {
      expect(mockObserve).toHaveBeenCalled();
    });
  });

  it("renders tree with manual group (draggable)", async () => {
    const regions = createMockRegions({ group: "manual" });
    const { container } = render(<OutlinerTree regions={regions} footer={null} />);

    await waitFor(() => {
      expect(container.querySelector(".dm-tree")).toBeInTheDocument();
    });
  });

  it("renders tree with label group", async () => {
    const regions = createMockRegions({ group: "label" });
    const { container } = render(<OutlinerTree regions={regions} footer={null} />);

    await waitFor(() => {
      expect(container.querySelector(".dm-tree")).toBeInTheDocument();
    });
  });
});
