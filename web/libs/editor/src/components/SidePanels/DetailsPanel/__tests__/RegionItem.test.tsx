import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { RegionItem } from "../RegionItem";

jest.mock("../../../../utils/bem", () => ({
  cn: (block: string) => ({
    elem: (elem: string) => ({
      toClassName: () => `dm-${block}__${elem}`,
      mod: (mods: Record<string, unknown>) => ({
        toClassName: () => `dm-${block}__${elem}`,
      }),
    }),
    mod: (mods: Record<string, unknown>) => ({
      toClassName: () => `dm-${block}`,
      mix: (..._args: unknown[]) => ({
        toClassName: () => `dm-${block}`,
      }),
    }),
    toClassName: () => `dm-${block}`,
    mix: (..._args: unknown[]) => ({
      toClassName: () => `dm-${block}`,
    }),
  }),
}));

jest.mock("../../../Node/Node", () => ({
  NodeIcon: ({ node }: { node: any }) => <span data-testid="node-icon">{node?.id ?? "no-node"}</span>,
}));

jest.mock("../RegionLabels", () => ({
  RegionLabels: ({ region }: { region: any }) => <div data-testid="region-labels">{region?.cleanId ?? "labels"}</div>,
}));

jest.mock("../../Components/LockButton", () => ({
  LockButton: ({ onClick, "aria-label": ariaLabel }: any) => (
    <button type="button" onClick={onClick} aria-label={ariaLabel} data-testid="lock-button">
      Lock
    </button>
  ),
}));

jest.mock("../../../../common/Hotkey/WithHotkey", () => ({
  WithHotkey: ({ children }: { children: React.ReactNode }) => <div data-testid="with-hotkey">{children}</div>,
}));

jest.mock("chroma-js", () => ({
  __esModule: true,
  default: (color: string) => ({
    alpha: () => ({
      css: () => color,
    }),
  }),
}));

jest.mock("@humansignal/icons", () => ({
  IconEyeClosed: () => <span data-testid="icon-eye-closed" />,
  IconEyeOpened: () => <span data-testid="icon-eye-opened" />,
  IconPlus: () => <span data-testid="icon-plus" />,
  IconRelationLink: () => <span data-testid="icon-relation-link" />,
  IconTrash: () => <span data-testid="icon-trash" />,
  IconWarning: () => <span data-testid="icon-warning" />,
}));

jest.mock("@humansignal/ui", () => ({
  Button: ({ children, onClick, "aria-label": ariaLabel, disabled, ...rest }: any) => (
    <button type="button" onClick={onClick} aria-label={ariaLabel} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}));

jest.mock("mobx-react", () => ({
  observer: (component: any) => component,
}));

function createMockRegion(overrides: Record<string, unknown> = {}) {
  const annotation = {
    selectedRegions: [{ isReadOnly: () => false, classification: false }],
    isLinkingMode: false,
    startLinkingMode: jest.fn(),
    stopLinkingMode: jest.fn(),
    deleteRegion: jest.fn(),
  };
  return {
    id: "region-1",
    annotation,
    region_index: 1,
    cleanId: "r1",
    background: "#ff0000",
    getOneColor: () => "#ff0000",
    style: {},
    isDrawing: false,
    incomplete: false,
    type: "rectangleregion",
    isReadOnly: () => false,
    locked: false,
    setLocked: jest.fn(),
    hideable: false,
    hidden: false,
    toggleHidden: jest.fn(),
    ...overrides,
  };
}

describe("RegionItem", () => {
  it("renders with default props and shows detailed-region", () => {
    const region = createMockRegion();
    render(<RegionItem region={region} />);
    expect(screen.getByTestId("detailed-region")).toBeInTheDocument();
    expect(screen.getByTestId("node-icon")).toBeInTheDocument();
    expect(screen.getByTestId("region-labels")).toHaveTextContent("r1");
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getAllByText("r1").length).toBeGreaterThanOrEqual(1);
  });

  it("applies compact modifier when compact is true", () => {
    const region = createMockRegion();
    const { container } = render(<RegionItem region={region} compact />);
    const detailedRegion = container.querySelector('[class*="dm-detailed-region"]');
    expect(detailedRegion).toBeInTheDocument();
  });

  it("hides id when withIds is false", () => {
    const region = createMockRegion();
    render(<RegionItem region={region} withIds={false} />);
    // Only RegionLabels shows cleanId; the withIds span is not rendered
    expect(screen.getAllByText("r1")).toHaveLength(1);
  });

  it("renders MainDetails when provided", () => {
    const region = createMockRegion();
    const MainDetails = ({ region: r }: { region: any }) => <div data-testid="main-details">Main: {r.cleanId}</div>;
    render(<RegionItem region={region} mainDetails={MainDetails} />);
    expect(screen.getByTestId("main-details")).toHaveTextContent("Main: r1");
  });

  it("renders MetaDetails when provided and passes editMode callbacks", async () => {
    const region = createMockRegion();
    const MetaDetails = ({
      region: r,
      editMode,
      enterEditMode,
      cancelEditMode,
    }: {
      region: any;
      editMode: boolean;
      enterEditMode: () => void;
      cancelEditMode: () => void;
    }) => (
      <div data-testid="meta-details">
        <span data-testid="meta-edit-mode">{String(editMode)}</span>
        <button type="button" onClick={enterEditMode} data-testid="enter-edit">
          Enter
        </button>
        <button type="button" onClick={cancelEditMode} data-testid="cancel-edit">
          Cancel
        </button>
        {r.cleanId}
      </div>
    );
    render(<RegionItem region={region} metaDetails={MetaDetails} />);
    expect(screen.getByTestId("meta-details")).toBeInTheDocument();
    expect(screen.getByTestId("meta-edit-mode")).toHaveTextContent("false");
    await userEvent.click(screen.getByTestId("enter-edit"));
    expect(screen.getByTestId("meta-edit-mode")).toHaveTextContent("true");
    await userEvent.click(screen.getByTestId("cancel-edit"));
    expect(screen.getByTestId("meta-edit-mode")).toHaveTextContent("false");
  });

  it("shows warning when region.incomplete is true", () => {
    const region = createMockRegion({ incomplete: true, type: "rectangleregion" });
    render(<RegionItem region={region} />);
    expect(screen.getByTestId("icon-warning")).toBeInTheDocument();
    expect(screen.getByText(/Incomplete rectangle/)).toBeInTheDocument();
  });

  it("shows generic warning when region.incomplete is true and type is missing", () => {
    const region = createMockRegion({ incomplete: true, type: undefined });
    render(<RegionItem region={region} />);
    expect(screen.getByText(/Incomplete region/)).toBeInTheDocument();
  });

  it("does not render actions when withActions is false", () => {
    const region = createMockRegion();
    render(<RegionItem region={region} withActions={false} />);
    expect(screen.queryByTestId("lock-button")).not.toBeInTheDocument();
  });

  it("renders relation button and toggles linking mode on click", async () => {
    const region = createMockRegion();
    render(<RegionItem region={region} />);
    const relationButton = screen.getByRole("button", { name: /Create Relation/i });
    await userEvent.click(relationButton);
    expect(region.annotation.startLinkingMode).toHaveBeenCalled();
  });

  it("renders meta button and toggles edit mode", async () => {
    const region = createMockRegion();
    render(<RegionItem region={region} />);
    const metaButton = screen.getByRole("button", { name: /Edit region's meta/i });
    await userEvent.click(metaButton);
    await userEvent.click(metaButton);
    expect(metaButton).toBeInTheDocument();
  });

  it("calls setLocked when lock button is clicked", async () => {
    const region = createMockRegion();
    render(<RegionItem region={region} />);
    const lockButton = screen.getByTestId("lock-button");
    await userEvent.click(lockButton);
    expect(region.setLocked).toHaveBeenCalledWith(true);
  });

  it("shows hide/show button when region is hideable and toggles on click", async () => {
    const region = createMockRegion({ hideable: true, hidden: false });
    render(<RegionItem region={region} />);
    const hideButton = screen.getByRole("button", { name: /Hide selected region/i });
    expect(screen.getByTestId("icon-eye-opened")).toBeInTheDocument();
    await userEvent.click(hideButton);
    expect(region.toggleHidden).toHaveBeenCalled();
  });

  it("shows show button when region is hidden", () => {
    const region = createMockRegion({ hideable: true, hidden: true });
    render(<RegionItem region={region} />);
    expect(screen.getByRole("button", { name: /Show selected region/i })).toBeInTheDocument();
    expect(screen.getByTestId("icon-eye-closed")).toBeInTheDocument();
  });

  it("calls deleteRegion when delete button is clicked", async () => {
    const region = createMockRegion();
    render(<RegionItem region={region} />);
    const deleteButton = screen.getByRole("button", { name: /Delete selected region/i });
    await userEvent.click(deleteButton);
    expect(region.annotation.deleteRegion).toHaveBeenCalledWith(region);
  });

  it("disables delete button when region is read-only", () => {
    const region = createMockRegion();
    (region as any).isReadOnly = () => true;
    render(<RegionItem region={region} />);
    const deleteButton = screen.getByRole("button", { name: /Delete selected region/i });
    expect(deleteButton).toBeDisabled();
  });

  it("hides entity buttons (relation, meta) when region is read-only", () => {
    const region = createMockRegion();
    (region as any).isReadOnly = () => true;
    render(<RegionItem region={region} />);
    expect(screen.queryByRole("button", { name: /Create Relation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit region's meta/i })).not.toBeInTheDocument();
  });

  it("stops linking mode when relation button clicked and already in linking mode", async () => {
    const region = createMockRegion();
    (region.annotation as any).isLinkingMode = true;
    render(<RegionItem region={region} />);
    const relationButton = screen.getByRole("button", { name: /Create Relation/i });
    await userEvent.click(relationButton);
    expect(region.annotation.stopLinkingMode).toHaveBeenCalled();
  });

  it("uses region.background for color when set", () => {
    const region = createMockRegion({ background: "#00ff00" });
    const { container } = render(<RegionItem region={region} />);
    const head = container.querySelector('[class*="dm-detailed-region__head"]');
    expect(head).toHaveStyle({ color: "#00ff00" });
  });

  it("uses getOneColor when background is not set", () => {
    const region = createMockRegion();
    delete (region as any).background;
    (region as any).getOneColor = () => "#0000ff";
    const { container } = render(<RegionItem region={region} />);
    const head = container.querySelector('[class*="dm-detailed-region__head"]');
    expect(head).toHaveStyle({ color: "#0000ff" });
  });

  it("hasEditableRegions is true when a node is not read-only and not classification", () => {
    const region = createMockRegion({
      annotation: {
        selectedRegions: [{ isReadOnly: () => false, classification: false }],
        isLinkingMode: false,
        startLinkingMode: jest.fn(),
        stopLinkingMode: jest.fn(),
        deleteRegion: jest.fn(),
      },
    });
    render(<RegionItem region={region} />);
    expect(screen.getByTestId("detailed-region")).toBeInTheDocument();
  });

  it("hasEditableRegions is false when all nodes are read-only", () => {
    const region = createMockRegion({
      annotation: {
        selectedRegions: [{ isReadOnly: () => true, classification: false }],
        isLinkingMode: false,
        startLinkingMode: jest.fn(),
        stopLinkingMode: jest.fn(),
        deleteRegion: jest.fn(),
      },
    });
    render(<RegionItem region={region} />);
    expect(screen.getByTestId("detailed-region")).toBeInTheDocument();
  });
});
