import { LabelStudio, Relations } from "@humansignal/frontend-test/helpers/LSF";
import { CREATE_RELATION_MODE, LINK_COMMENT_MODE } from "../../../../src/stores/Annotation/LinkingModes";
import { simpleTextConfig, simpleTextData, simpleTextResult } from "../../data/linked_modes/to_comments";

describe("Linking modes: To comments", () => {
  it("should link region to comments", () => {
    const comment = {
      setRegionLink: cy.stub().as("setRegionLink"),
    };
    LabelStudio.params().config(simpleTextConfig).data(simpleTextData).withResult(simpleTextResult).init();
    LabelStudio.waitForObjectsReady();

    // @todo: implement real world scenario after the feature is implemented
    cy.window().then((win) => {
      win.Htx.annotationStore.selected.startLinkingMode(LINK_COMMENT_MODE, comment);
      const region = win.Htx.annotationStore.selected.regionStore.regions[0];
      win.Htx.annotationStore.selected.addLinkedRegion(region);
      win.Htx.annotationStore.selected.stopLinkingMode();
      cy.get("@setRegionLink").should("be.calledWith", region);
    });
  });

  it("should activate only one mode at a time", () => {
    const comment = {
      setRegionLink: cy.stub().as("setRegionLink"),
    };
    LabelStudio.params().config(simpleTextConfig).data(simpleTextData).withResult(simpleTextResult).init();
    LabelStudio.waitForObjectsReady();

    // @todo: implement real world scenario after the feature is implemented
    cy.window().then((win) => {
      win.Htx.annotationStore.selected.startLinkingMode(CREATE_RELATION_MODE, comment);
      win.Htx.annotationStore.selected.startLinkingMode(LINK_COMMENT_MODE, comment);
      const region = win.Htx.annotationStore.selected.regionStore.regions[0];
      win.Htx.annotationStore.selected.addLinkedRegion(region);
      win.Htx.annotationStore.selected.stopLinkingMode();
      cy.get("@setRegionLink").should("be.calledOnce");
      Relations.hasRelations(0);
    });
  });
});
