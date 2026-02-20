import { LabelStudio, ToolBar } from "@humansignal/frontend-test/helpers/LSF";
import { FF_DEV_3391 } from "../../../../src/utils/feature-flags";
import { ratingConfig, ratingResult, textData } from "../../data/view_all/readonly";

beforeEach(() => {
  LabelStudio.addFeatureFlagsOnPageLoad({
    [FF_DEV_3391]: true,
  });
});

describe("View All - Compare / Grid (Codecov: Grid.jsx, Toolbar.jsx)", () => {
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
});
