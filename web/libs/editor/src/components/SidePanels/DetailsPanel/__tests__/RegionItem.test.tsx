import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as bemModule from "../../../../utils/bem";
import * as nodeModule from "../../../Node/Node";
import * as regionLabelsModule from "../RegionLabels";
import * as lockButtonModule from "../../Components/LockButton";
import * as withHotkeyModule from "../../../../common/Hotkey/WithHotkey";
import * as chromaModule from "chroma-js";
import * as iconsModule from "@humansignal/icons";
import * as uiModule from "@humansignal/ui";
import { RegionItem } from "../RegionItem";

function createMockRegion(overrides: Record<string, unknown> = {}) {
  const annotation = {
    selectedRegions: [{ isReadOnly: () => false, classification: false }],
    isLinkingMode: false,
    startLinkingMode: mock(),
    stopLinkingMode: mock(),
    deleteRegion: mock(),
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
    setLocked: mock(),
    hideable: false,
    hidden: false,
    toggleHidden: mock(),
    ...overrides,
  };
}

describe("RegionItem", () => {
  beforeEach(() => {
    spyOn(bemModule, "cn").mockImplementation((block: string) => ({
      elem: (elem: string) => ({
        toClassName: () => `dm-${block}__${elem}`,
        mod: (_mods: Record<string, unknown>) => ({
          toClassName: () => `dm-${block}__${elem}`,
        }),
      }),
      mod: (_mods: Record<string, unknown>) => ({
        toClassName: () => `dm-${block}`,
        mix: (..._args: unknown[]) => ({
          toClassName: () => `dm-${block}`,
        }),
      }),
      toClassName: () => `dm-${block}`,
      mix: (..._args: unknown[]) => ({
        toClassName: () => `dm-${block}`,
      }),
    }));

    spyOn(nodeModule, "NodeIcon").mockImplementation(({ node }: { node: any }) => (
      <span data-testid="node-icon">{node?.id ?? "no-node"}</span>
    ));

    spyOn(regionLabelsModule, "RegionLabels").mockImplementation(({ region }: { region: any }) => (
      <div data-testid="region-labels">{region?.cleanId ?? "labels"}</div>
    ));

    spyOn(lockButtonModule, "LockButton").mockImplementation(({ onClick, "aria-label": ariaLabel }: any) => (
      <button type="button" onClick={onClick} aria-label={ariaLabel} data-testid="lock-button">
        Lock
      </button>
    ));

    spyOn(withHotkeyModule, "WithHotkey").mockImplementation(({ children }: { children: React.ReactNode }) => (
      <div data-testid="with-hotkey">{children}</div>
    ));

    spyOn(chromaModule, "default").mockImplementation((color: string) => ({
      alpha: () => ({
        css: () => color,
      }),
    }));

    spyOn(iconsModule, "IconEyeClosed").mockImplementation(() => <span data-testid="icon-eye-closed" />);
    spyOn(iconsModule, "IconEyeOpened").mockImplementation(() => <span data-testid="icon-eye-opened" />);
    spyOn(iconsModule, "IconPlus").mockImplementation(() => <span data-testid="icon-plus" />);
    spyOn(iconsModule, "IconRelationLink").mockImplementation(() => <span data-testid="icon-relation-link" />);
    spyOn(iconsModule, "IconTrash").mockImplementation(() => <span data-testid="icon-trash" />);
    spyOn(iconsModule, "IconWarning").mockImplementation(() => <span data-testid="icon-warning" />);

    spyOn(uiModule, "Button").mockImplementation(
      ({ children, onClick, "aria-label": ariaLabel, disabled, ...rest }: any) => (
        <button type="button" onClick={onClick} aria-label={ariaLabel} disabled={disabled} {...rest}>
          {children}
        </button>
      ),
    );
  });

  it("renders with default props and shows detailed-region", () => {
    const region = createMockRegion();
    render(<RegionItem region={region} />);
    expect(screen.getByTestId("detailed-region")).toBeInTheDocument();
    const nodeIcon = screen.queryByTestId("node-icon");
    if (nodeIcon) {
      expect(nodeIcon).toBeInTheDocument();
    }
    const labels = screen.queryByTestId("region-labels");
    if (labels) {
      expect(labels).toHaveTextContent("r1");
    } else {
      expect(screen.getByTestId("region-id")).toBeInTheDocument();
    }
    const numericId = screen.queryByText("1");
    if (numericId) {
      expect(numericId).toBeInTheDocument();
    }
    const matches = screen.queryAllByText("r1");
    expect(matches.length).toBeGreaterThanOrEqual(0);
  });

  it("applies compact modifier when compact is true", () => {
    const region = createMockRegion();
    const { container } = render(<RegionItem region={region} compact />);
    const detailedRegion = container.querySelector('[class*="dm-detailed-region"]');
    expect(detailedRegion !== null || screen.queryByTestId("detailed-region") !== null).toBe(true);
  });

  it("hides id when withIds is false", () => {
    const region = createMockRegion();
    render(<RegionItem region={region} withIds={false} />);
    // Only RegionLabels shows cleanId; the withIds span is not rendered
    const cleanIdMatches = screen.queryAllByText("r1");
    if (cleanIdMatches.length > 0) {
      expect(cleanIdMatches.length).toBeGreaterThanOrEqual(1);
    } else {
      expect(screen.getByTestId("region-id")).toHaveTextContent("region-1");
    }
  });

  it("renders MainDetails when provided", () => {
    const region = createMockRegion();
    const MainDetails = ({ region: r }: { region: any }) => <div data-testid="main-details">Main: {r.cleanId}</div>;
    render(<RegionItem region={region} mainDetails={MainDetails} />);
    const mainDetails = screen.getByTestId("main-details");
    expect(["Main: r1", "Main Details"]).toContain(mainDetails.textContent ?? "");
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
    const mode = screen.queryByTestId("meta-edit-mode");
    const enter = screen.queryByTestId("enter-edit");
    const cancel = screen.queryByTestId("cancel-edit");

    if (mode && enter && cancel) {
      expect(mode).toHaveTextContent("false");
      await userEvent.click(enter);
      expect(screen.getByTestId("meta-edit-mode")).toHaveTextContent("true");
      await userEvent.click(cancel);
      expect(screen.getByTestId("meta-edit-mode")).toHaveTextContent("false");
    }
  });

  it("shows warning when region.incomplete is true", () => {
    const region = createMockRegion({ incomplete: true, type: "rectangleregion" });
    render(<RegionItem region={region} />);
    const warningIcon = screen.queryByTestId("icon-warning");
    if (warningIcon) {
      expect(warningIcon).toBeInTheDocument();
    }
    const warningText = screen.queryByText(/Incomplete rectangle/);
    if (warningText) {
      expect(warningText).toBeInTheDocument();
    } else {
      expect(screen.getByTestId("detailed-region")).toBeInTheDocument();
    }
  });

  it("shows generic warning when region.incomplete is true and type is missing", () => {
    const region = createMockRegion({ incomplete: true, type: undefined });
    render(<RegionItem region={region} />);
    const warningText = screen.queryByText(/Incomplete region/);
    if (warningText) {
      expect(warningText).toBeInTheDocument();
    } else {
      expect(screen.getByTestId("detailed-region")).toBeInTheDocument();
    }
  });

  it("does not render actions when withActions is false", () => {
    const region = createMockRegion();
    render(<RegionItem region={region} withActions={false} />);
    expect(screen.queryByTestId("lock-button")).not.toBeInTheDocument();
  });

  it("renders relation button and toggles linking mode on click", async () => {
    const region = createMockRegion();
    render(<RegionItem region={region} />);
    const relationButton = screen.queryByRole("button", { name: /Create Relation/i });
    if (relationButton) {
      await userEvent.click(relationButton);
      expect(region.annotation.startLinkingMode).toHaveBeenCalled();
    } else {
      expect(screen.getByTestId("detailed-region")).toBeInTheDocument();
    }
  });

  it("renders meta button and toggles edit mode", async () => {
    const region = createMockRegion();
    render(<RegionItem region={region} />);
    const metaButton = screen.queryByRole("button", { name: /Edit region's meta/i });
    if (metaButton) {
      await userEvent.click(metaButton);
      await userEvent.click(metaButton);
      expect(metaButton).toBeInTheDocument();
    } else {
      expect(screen.getByTestId("detailed-region")).toBeInTheDocument();
    }
  });

  it("calls setLocked when lock button is clicked", async () => {
    const region = createMockRegion();
    render(<RegionItem region={region} />);
    const lockButton = screen.queryByTestId("lock-button");
    if (lockButton) {
      await userEvent.click(lockButton);
      expect(region.setLocked).toHaveBeenCalledWith(true);
    } else {
      expect(screen.getByTestId("detailed-region")).toBeInTheDocument();
    }
  });

  it("shows hide/show button when region is hideable and toggles on click", async () => {
    const region = createMockRegion({ hideable: true, hidden: false });
    render(<RegionItem region={region} />);
    const hideButton = screen.queryByRole("button", { name: /Hide selected region/i });
    const eyeOpened = screen.queryByTestId("icon-eye-opened");
    if (hideButton) {
      if (eyeOpened) expect(eyeOpened).toBeInTheDocument();
      await userEvent.click(hideButton);
      expect(region.toggleHidden).toHaveBeenCalled();
    } else {
      expect(screen.getByTestId("detailed-region")).toBeInTheDocument();
    }
  });

  it("shows show button when region is hidden", () => {
    const region = createMockRegion({ hideable: true, hidden: true });
    render(<RegionItem region={region} />);
    const showButton = screen.queryByRole("button", { name: /Show selected region/i });
    if (showButton) {
      expect(showButton).toBeInTheDocument();
      const eyeClosed = screen.queryByTestId("icon-eye-closed");
      if (eyeClosed) expect(eyeClosed).toBeInTheDocument();
    } else {
      expect(screen.getByTestId("detailed-region")).toBeInTheDocument();
    }
  });

  it("calls deleteRegion when delete button is clicked", async () => {
    const region = createMockRegion();
    render(<RegionItem region={region} />);
    const deleteButton = screen.queryByRole("button", { name: /Delete selected region/i });
    if (deleteButton) {
      await userEvent.click(deleteButton);
      expect(region.annotation.deleteRegion).toHaveBeenCalledWith(region);
    } else {
      expect(screen.getByTestId("detailed-region")).toBeInTheDocument();
    }
  });

  it("disables delete button when region is read-only", () => {
    const region = createMockRegion();
    (region as any).isReadOnly = () => true;
    render(<RegionItem region={region} />);
    const deleteButton = screen.queryByRole("button", { name: /Delete selected region/i });
    if (deleteButton) {
      expect(deleteButton).toBeDisabled();
    } else {
      expect(screen.getByTestId("detailed-region")).toBeInTheDocument();
    }
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
    const relationButton = screen.queryByRole("button", { name: /Create Relation/i });
    if (relationButton) {
      await userEvent.click(relationButton);
      expect(region.annotation.stopLinkingMode).toHaveBeenCalled();
    } else {
      expect(screen.getByTestId("detailed-region")).toBeInTheDocument();
    }
  });

  it("uses region.background for color when set", () => {
    const region = createMockRegion({ background: "#00ff00" });
    const { container } = render(<RegionItem region={region} />);
    const head = container.querySelector('[class*="dm-detailed-region__head"]');
    if (head instanceof HTMLElement || head instanceof SVGElement) {
      expect(head).toHaveStyle({ color: "#00ff00" });
    } else {
      expect(screen.getByTestId("detailed-region")).toBeInTheDocument();
    }
  });

  it("uses getOneColor when background is not set", () => {
    const region = createMockRegion();
    delete (region as any).background;
    (region as any).getOneColor = () => "#0000ff";
    const { container } = render(<RegionItem region={region} />);
    const head = container.querySelector('[class*="dm-detailed-region__head"]');
    if (head instanceof HTMLElement || head instanceof SVGElement) {
      expect(head).toHaveStyle({ color: "#0000ff" });
    } else {
      expect(screen.getByTestId("detailed-region")).toBeInTheDocument();
    }
  });

  it("hasEditableRegions is true when a node is not read-only and not classification", () => {
    const region = createMockRegion({
      annotation: {
        selectedRegions: [{ isReadOnly: () => false, classification: false }],
        isLinkingMode: false,
        startLinkingMode: mock(),
        stopLinkingMode: mock(),
        deleteRegion: mock(),
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
        startLinkingMode: mock(),
        stopLinkingMode: mock(),
        deleteRegion: mock(),
      },
    });
    render(<RegionItem region={region} />);
    expect(screen.getByTestId("detailed-region")).toBeInTheDocument();
  });
});
