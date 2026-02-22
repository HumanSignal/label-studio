import { FF_FIT_720_LAZY_LOAD_ANNOTATIONS } from "@humansignal/core/lib/utils/feature-flags";
import { LabelStudio, ToolBar } from "@humansignal/frontend-test/helpers/LSF";
import { FF_DEV_3391 } from "../../../../src/utils/feature-flags";
import { ratingConfig, ratingResult, textData } from "../../data/view_all/readonly";

beforeEach(() => {
  LabelStudio.addFeatureFlagsOnPageLoad({
    [FF_DEV_3391]: true,
  });
});

describe("View All - Compare / Grid", () => {
  it("renders Compare view (Grid) with multiple annotations", () => {
    LabelStudio.params().config(ratingConfig).data(textData).withResult(ratingResult).withResult(ratingResult).init();

    ToolBar.viewAllBtn.click();

    // Grid renders annotation panels (each has id c-<annotationId>)
    cy.get("[id^='c-']").should("have.length.at.least", 2);
  });

  it("switches to Side-by-side tab when annotations:summary and renders Grid", () => {
    LabelStudio.params()
      .config(ratingConfig)
      .data(textData)
      .withResult(ratingResult)
      .withResult(ratingResult)
      .withInterface("annotations:summary")
      .init();

    ToolBar.viewAllBtn.click();

    cy.get("[data-testid='compare-all-summary-tab']").should("be.visible");
    cy.get("[data-testid='compare-all-side-by-side-tab']").click();

    cy.get("[id^='c-']").should("have.length.at.least", 2);
  });

  it("navigates Grid with Move left and Move right buttons", () => {
    LabelStudio.params().config(ratingConfig).data(textData).withResult(ratingResult).withResult(ratingResult).init();

    ToolBar.viewAllBtn.click();

    cy.get("[id^='c-']").should("have.length.at.least", 2);
    cy.get("[aria-label='Move left']").should("be.visible");
    cy.get("[aria-label='Move right']").should("be.visible");

    cy.get("[aria-label='Move right']").click();
    cy.get("[aria-label='Move left']").click();
  });

  it("renders Grid with left/right buttons when FF_DEV_3391 is off (classic clone path)", () => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      [FF_DEV_3391]: false,
    });
    LabelStudio.params().config(ratingConfig).data(textData).withResult(ratingResult).withResult(ratingResult).init();

    ToolBar.viewAllBtn.click();

    cy.get("[id^='c-']").should("have.length.at.least", 2);
    cy.get("[aria-label='Move left']").should("be.visible");
    cy.get("[aria-label='Move right']").should("be.visible");
  });

  it("selects annotation when clicking panel tab in Grid", () => {
    LabelStudio.params().config(ratingConfig).data(textData).withResult(ratingResult).withResult(ratingResult).init();

    ToolBar.viewAllBtn.click();

    cy.get("[id^='c-']").should("have.length.at.least", 2);
    cy.get("[id^='c-']").eq(1).find("[data-annotation-id]").first().click();
    // Selecting an annotation with exitViewAll closes the Compare view, so the grid is no longer visible
    cy.get(".lsf-editor").should("be.visible");
  });

  describe("Virtualized Grid (FIT-720)", () => {
    beforeEach(() => {
      LabelStudio.addFeatureFlagsOnPageLoad({
        [FF_DEV_3391]: true,
        [FF_FIT_720_LAZY_LOAD_ANNOTATIONS]: true,
      });
    });

    it("renders virtualized Grid with many annotations and navigation buttons", () => {
      let params = LabelStudio.params().config(ratingConfig).data(textData);
      for (let i = 0; i < 11; i++) {
        params = params.withResult(ratingResult);
      }
      params.init();

      ToolBar.viewAllBtn.click();

      cy.get("[id^='c-']").should("have.length.at.least", 2);
      cy.get("[aria-label='Move right']").should("be.visible").click();
      cy.get("[aria-label='Move left']").should("be.visible").click();
    });
  });
});
