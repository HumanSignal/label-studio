import { render, screen } from "@testing-library/react";
import * as bemModule from "../../../../utils/bem";
import * as commentsModule from "../../../Comments/Comments";
import * as annotationHistoryModule from "../../../CurrentEntity/AnnotationHistory";
import * as regionDetailsModule from "../RegionDetails";
import * as regionItemModule from "../RegionItem";
import * as relationsModule from "../Relations";
import * as relationsControlsModule from "../RelationsControls";
import * as emptyStateModule from "../../Components/EmptyState";
import * as iconsModule from "@humansignal/icons";
import * as docsModule from "../../../../utils/docs";
import { Relations, Info } from "../DetailsPanel";

const injectedStore = { hasInterface: () => false };

describe("DetailsPanel", () => {
  beforeEach(() => {
    spyOn(bemModule, "cn").mockImplementation((block: string) => ({
      elem: (elem: string) => ({
        toClassName: () => `dm-${block}__${elem}`,
        mod: (_mods: any) => ({
          toClassName: () => `dm-${block}__${elem}`,
        }),
      }),
      mod: (_mods: any) => ({
        toClassName: () => `dm-${block}`,
        mix: (..._args: any[]) => ({
          toClassName: () => `dm-${block}`,
        }),
      }),
      toClassName: () => `dm-${block}`,
      mix: (..._args: any[]) => ({
        toClassName: () => `dm-${block}`,
      }),
    }));

    spyOn(commentsModule, "Comments").mockImplementation((props: any) => (
      <div data-testid="comments-component" {...props} />
    ));

    spyOn(annotationHistoryModule, "AnnotationHistory").mockImplementation((props: any) => (
      <div data-testid="annotation-history" {...props} />
    ));

    spyOn(regionDetailsModule, "RegionDetailsMain").mockImplementation((props: any) => (
      <div data-testid="region-details-main" {...props} />
    ));
    spyOn(regionDetailsModule, "RegionDetailsMeta").mockImplementation((props: any) => (
      <div data-testid="region-details-meta" {...props} />
    ));

    spyOn(regionItemModule, "RegionItem").mockImplementation(({ region, mainDetails, metaDetails }: any) => (
      <div data-testid="detailed-region">
        <div data-testid="region-id">{region.id}</div>
        {mainDetails && <div data-testid="main-details">Main Details</div>}
        {metaDetails && <div data-testid="meta-details">Meta Details</div>}
      </div>
    ));

    spyOn(relationsModule, "Relations").mockImplementation((props: any) => (
      <div data-testid="relations-component" {...props} />
    ));

    spyOn(relationsControlsModule, "RelationsControls").mockImplementation((props: any) => (
      <div data-testid="relations-controls" {...props} />
    ));

    spyOn(emptyStateModule, "EmptyState").mockImplementation(({ icon, header, description, learnMore }: any) => (
      <div data-testid="empty-state">
        <div data-testid="empty-state-icon">{icon}</div>
        <div data-testid="empty-state-header">{header}</div>
        <div data-testid="empty-state-description">{description}</div>
        {learnMore && (
          <a href={learnMore.href} data-testid={learnMore.testId} target="_blank" rel="noopener noreferrer">
            {learnMore.text}
          </a>
        )}
      </div>
    ));

    spyOn(iconsModule, "IconCursor").mockImplementation(({ width, height }: { width: number; height: number }) => (
      <svg data-testid="icon-cursor" width={width} height={height} />
    ));
    spyOn(iconsModule, "IconRelationLink").mockImplementation(
      ({ width, height }: { width: number; height: number }) => (
        <svg data-testid="icon-relation-link" width={width} height={height} />
      ),
    );

    spyOn(docsModule, "getDocsUrl").mockImplementation((path: string) => `https://docs.example.com/${path}`);
  });

  describe("RelationsTab", () => {
    const mockCurrentEntityWithRelations = {
      relationStore: {
        size: 3,
      },
    };

    const mockCurrentEntityWithoutRelations = {
      relationStore: {
        size: 0,
      },
    };

    describe("when hasRelations is false", () => {
      it("renders empty state with correct icon", () => {
        render(<Relations currentEntity={mockCurrentEntityWithoutRelations} store={injectedStore} />);

        const emptyState = screen.getByTestId("empty-state");
        expect(emptyState).toBeInTheDocument();

        const icon = screen.getByTestId("icon-relation-link");
        expect(icon).toBeInTheDocument();
        expect(icon).toHaveAttribute("width", "24");
        expect(icon).toHaveAttribute("height", "24");
      });

      it("renders empty state with correct header", () => {
        render(<Relations currentEntity={mockCurrentEntityWithoutRelations} store={injectedStore} />);

        const header = screen.getByTestId("empty-state-header");
        expect(header).toBeInTheDocument();
        expect(header).toHaveTextContent("Create relations between regions");
      });

      it("renders empty state with correct description", () => {
        render(<Relations currentEntity={mockCurrentEntityWithoutRelations} store={injectedStore} />);

        const description = screen.getByTestId("empty-state-description");
        expect(description).toBeInTheDocument();
        expect(description).toHaveTextContent("Link regions to define relationships between them");
      });

      it("renders learn more link with correct attributes", () => {
        render(<Relations currentEntity={mockCurrentEntityWithoutRelations} store={injectedStore} />);

        const learnMoreLink = screen.getByTestId("relations-panel-learn-more");
        expect(learnMoreLink).toBeInTheDocument();
        expect(learnMoreLink).toHaveAttribute(
          "href",
          "https://docs.example.com/guide/labeling#Add-relations-between-annotations",
        );
        expect(learnMoreLink).toHaveAttribute("target", "_blank");
        expect(learnMoreLink).toHaveAttribute("rel", "noopener noreferrer");
        expect(learnMoreLink).toHaveTextContent("Learn more");
      });

      it("does not render relations controls when no relations exist", () => {
        render(<Relations currentEntity={mockCurrentEntityWithoutRelations} store={injectedStore} />);

        expect(screen.queryByTestId("relations-controls")).not.toBeInTheDocument();
        expect(screen.queryByTestId("relations-component")).not.toBeInTheDocument();
      });

      it("does not render relations count header when no relations exist", () => {
        render(<Relations currentEntity={mockCurrentEntityWithoutRelations} store={injectedStore} />);

        expect(screen.queryByText(/Relations \(/)).not.toBeInTheDocument();
      });
    });

    describe("when hasRelations is true", () => {
      it("does not render empty state when relations exist", () => {
        render(<Relations currentEntity={mockCurrentEntityWithRelations} store={injectedStore} />);

        expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
      });

      it("renders relations controls and component when relations exist", () => {
        render(<Relations currentEntity={mockCurrentEntityWithRelations} store={injectedStore} />);

        expect(screen.getByTestId("relations-controls")).toBeInTheDocument();
        expect(screen.getByTestId("relations-component")).toBeInTheDocument();
      });

      it("renders relations count in header when relations exist", () => {
        render(<Relations currentEntity={mockCurrentEntityWithRelations} store={injectedStore} />);

        expect(screen.getByText("Relations (3)")).toBeInTheDocument();
      });
    });
  });

  describe("Info", () => {
    const mockSelectionWithRegions = {
      size: 2,
      list: [
        { id: "region1", type: "rectangle" },
        { id: "region2", type: "polygon" },
      ],
    };

    const mockSelectionEmpty = {
      size: 0,
      list: [],
    };

    describe("when nothingSelected is true", () => {
      it("renders empty state with correct icon when no selection", () => {
        render(<Info selection={mockSelectionEmpty} store={injectedStore} />);

        const emptyState = screen.getByTestId("empty-state");
        expect(emptyState).toBeInTheDocument();

        const icon = screen.getByTestId("icon-cursor");
        expect(icon).toBeInTheDocument();
        expect(icon).toHaveAttribute("width", "24");
        expect(icon).toHaveAttribute("height", "24");
      });

      it("renders empty state with correct header when no selection", () => {
        render(<Info selection={mockSelectionEmpty} store={injectedStore} />);

        const header = screen.getByTestId("empty-state-header");
        expect(header).toBeInTheDocument();
        expect(header).toHaveTextContent("View region details");
      });

      it("renders empty state with correct description when no selection", () => {
        render(<Info selection={mockSelectionEmpty} store={injectedStore} />);

        const description = screen.getByTestId("empty-state-description");
        expect(description).toBeInTheDocument();
        expect(description).toHaveTextContent("Select a region to view its properties, metadata and available actions");
      });

      it("does not render region details on info panel when no selection", () => {
        render(<Info selection={mockSelectionEmpty} store={injectedStore} />);

        const detailedRegions = screen.queryAllByTestId("detailed-region");
        expect(detailedRegions).toHaveLength(0);
      });

      it("does not render info panel when no selection", () => {
        render(<Info selection={mockSelectionEmpty} store={injectedStore} />);

        const detailedRegions = screen.queryAllByTestId("detailed-region");
        expect(detailedRegions).toHaveLength(0);
      });

      it("renders empty state when selection is null", () => {
        render(<Info selection={null} store={injectedStore} />);

        const emptyState = screen.getByTestId("empty-state");
        expect(emptyState).toBeInTheDocument();
      });

      it("renders empty state when selection is undefined", () => {
        render(<Info selection={undefined} store={injectedStore} />);

        const emptyState = screen.getByTestId("empty-state");
        expect(emptyState).toBeInTheDocument();
      });
    });

    describe("when nothingSelected is false", () => {
      it("does not render empty state when regions are selected", () => {
        render(<Info selection={mockSelectionWithRegions} store={injectedStore} />);

        expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
      });

      it("renders selection details when regions are selected", () => {
        render(<Info selection={mockSelectionWithRegions} store={injectedStore} />);

        const detailedRegions = screen.getAllByTestId("detailed-region");
        expect(detailedRegions).toHaveLength(2);
      });

      it("renders region info with specific regions selected", () => {
        render(<Info selection={mockSelectionWithRegions} store={injectedStore} />);

        const detailedRegions = screen.getAllByTestId("detailed-region");
        expect(detailedRegions).toHaveLength(2);

        // Check that specific regions are rendered
        expect(screen.getByText("region1")).toBeInTheDocument();
        expect(screen.getByText("region2")).toBeInTheDocument();
      });

      it("renders main and meta details for each region", () => {
        render(<Info selection={mockSelectionWithRegions} store={injectedStore} />);

        const mainDetails = screen.getAllByTestId("main-details");
        const metaDetails = screen.getAllByTestId("meta-details");

        expect(mainDetails).toHaveLength(2);
        expect(metaDetails).toHaveLength(2);
      });
    });

    describe("edge cases", () => {
      it("handles selection with size 0 but non-empty list", () => {
        const edgeCaseSelection = {
          size: 0,
          list: [{ id: "region1", type: "rectangle" }], // Inconsistent state
        };

        render(<Info selection={edgeCaseSelection} store={injectedStore} />);

        // Should render empty state based on size property
        const emptyState = screen.getByTestId("empty-state");
        expect(emptyState).toBeInTheDocument();
      });

      it("handles selection with positive size but empty list", () => {
        const edgeCaseSelection = {
          size: 1,
          list: [], // Inconsistent state
        };

        render(<Info selection={edgeCaseSelection} store={injectedStore} />);

        // Should not render empty state based on size property
        expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();

        // But also won't render region items since list is empty
        const detailedRegions = screen.queryAllByTestId("detailed-region");
        expect(detailedRegions).toHaveLength(0);
      });
    });
  });
});
