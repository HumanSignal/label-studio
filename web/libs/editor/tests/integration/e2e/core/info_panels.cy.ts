import { Labels, LabelStudio } from "@humansignal/frontend-test/helpers/LSF";
import { RichText } from "@humansignal/frontend-test/helpers/LSF/RichText";
import { FF_DEV_3873 } from "libs/editor/src/utils/feature-flags";
import { configSimple, dataSimple, resultSimple } from "../../data/core/info_panels";

describe("Label Studio UI info panels", () => {
  it("Open every panel and interact with regions", () => {
    LabelStudio.setFeatureFlagsOnPageLoad({
      [FF_DEV_3873]: true,
    });

    LabelStudio.init({
      config: configSimple,
      task: {
        annotations: [{ id: 1, result: [resultSimple] }],
        predictions: [],
        id: 1,
        data: dataSimple,
      },
    });

    // Info panel is active and it has empty state
    cy.get("[class$=tab-container_active]").find("#Info-draggable").should("exist");
    cy.contains("View region details").should("be.visible");

    // Regions panel is also active but has one region in it
    cy.get("[class$=tab-container_active]").find("#Regions-draggable").should("exist");
    // This region's score is visible
    cy.get("[class$=control_type_score]").should("have.text", "0.89");

    // Change regions grouping by openining dropdown; it will be closed automatically
    cy.contains("Manual").click();
    cy.contains("Group by Label").should("be.visible");
    // waiting for dropdown to be fully visible
    // @todo better options?
    cy.wait(200);
    cy.contains("Group by Label").click();
    cy.get("[class$=lsf-outliner-item__title").contains("Word1").should("be.visible");
    cy.contains("Group by Label").should("not.exist");

    // Select Relations panel, empty state is shown, Regions will be unselected
    cy.get("#Relations-draggable").click();
    cy.get("[class$=tab-container_active]").find("#Regions-draggable").should("not.exist");
    cy.contains("Create relations between regions").should("be.visible");

    // Select History panel, Info panel will be unselected
    cy.get("#History-draggable").click();
    // No annotation history so far
    cy.get("[class$=tab-container_active]").find("#Info-draggable").should("not.exist");
    cy.contains("See a log of user actions").should("be.visible");

    // Change editor settings to keep region selected
    cy.get("[aria-label='Settings']").click();
    cy.contains("Select region after creating it").click();
    cy.get("[aria-label='Close']").click();

    // Create second region in Text tag
    Labels.select("Word2");
    RichText.selectText("This");
    RichText.hasRegionWithText("This");

    Labels.selectedLabel.contains("Word2").should("exist");

    // Create relation between regions by hotkey
    cy.get("body").type("{alt}{r}");
    RichText.findRegionWithText("text").click();
    // First click will trigger hover, so we need second click to actually click on the region
    RichText.findRegionWithText("text").click();

    // There is a new relation in a list
    cy.contains("Relations (1)").should("be.visible");
    cy.get("[data-testid='detailed-region']").contains("Word2").should("be.visible");
    cy.get("[data-testid='detailed-region']").contains("Word1").should("be.visible");

    // And there is also new regions group in a list
    cy.get("#Regions-draggable").click();
    cy.get("[class$=lsf-outliner-item__title").contains("Word2").should("be.visible");

    // And draft panel just appeared in a history
    cy.get("[class$=history-item_selected]").find("[data-reason='Draft']").should("be.visible");
  });
});
