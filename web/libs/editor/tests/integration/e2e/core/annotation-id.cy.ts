import { LabelStudio } from "@humansignal/frontend-test/helpers/LSF";
import { FF_DEV_3873 } from "../../../../src/utils/feature-flags";

describe("Annotation ID", () => {
  beforeEach(() => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      [FF_DEV_3873]: true,
    });
  });

  it("should have data-annotation-id attribute matching the copied annotation ID", () => {
    // Initialize with multiple annotations to test with different IDs
    LabelStudio.init({
      config: `<View>
        <Text name="text" value="$text"/>
        <Choices name="choice" toName="text">
          <Choice value="Choice1"/>
          <Choice value="Choice2"/>
        </Choices>
      </View>`,
      task: {
        id: 1,
        annotations: [
          { id: 1001, result: [] },
          { id: 1002, result: [] },
          { id: 1003, result: [] },
        ],
        predictions: [],
        data: {
          text: "Sample text for annotation testing",
        },
      },
    });

    LabelStudio.waitForObjectsReady();

    // Get all annotation buttons
    cy.get(".lsf-annotation-button").should("have.length", 3);

    // Test the first annotation (ID 1001)
    cy.log("Testing annotation ID 1001");
    cy.get(".lsf-annotation-button").eq(0).should("have.attr", "data-annotation-id", "1001");

    // Open the context menu for the first annotation
    cy.get(".lsf-annotation-button__trigger").eq(0).click();

    // Click "Copy Annotation ID" from the dropdown
    cy.get(".lsf-dropdown").should("be.visible").find('[class*="option--"]').contains("Copy Annotation ID").click();

    // Verify the clipboard contains the correct annotation ID
    cy.window().then((win) => {
      win.navigator.clipboard.readText().then((text) => {
        expect(text).to.equal("1001");
      });
    });

    // Test the second annotation (ID 1002)
    cy.log("Testing annotation ID 1002");
    cy.get(".lsf-annotation-button").eq(1).should("have.attr", "data-annotation-id", "1002");

    // Open the context menu for the second annotation
    cy.get(".lsf-annotation-button__trigger").eq(1).click();

    // Click "Copy Annotation ID" from the dropdown
    cy.get(".lsf-dropdown").should("be.visible").find('[class*="option--"]').contains("Copy Annotation ID").click();

    // Verify the clipboard contains the correct annotation ID
    cy.window().then((win) => {
      win.navigator.clipboard.readText().then((text) => {
        expect(text).to.equal("1002");
      });
    });

    // Test the third annotation (ID 1003)
    cy.log("Testing annotation ID 1003");
    cy.get(".lsf-annotation-button").eq(2).should("have.attr", "data-annotation-id", "1003");

    // Open the context menu for the third annotation
    cy.get(".lsf-annotation-button__trigger").eq(2).click();

    // Click "Copy Annotation ID" from the dropdown
    cy.get(".lsf-dropdown").should("be.visible").find('[class*="option--"]').contains("Copy Annotation ID").click();

    // Verify the clipboard contains the correct annotation ID
    cy.window().then((win) => {
      win.navigator.clipboard.readText().then((text) => {
        expect(text).to.equal("1003");
      });
    });
  });

  it("should allow selecting annotation by data-annotation-id attribute", () => {
    LabelStudio.init({
      config: `<View>
        <Text name="text" value="$text"/>
        <Choices name="choice" toName="text">
          <Choice value="Choice1"/>
        </Choices>
      </View>`,
      task: {
        id: 1,
        annotations: [
          { id: 2001, result: [] },
          { id: 2002, result: [] },
        ],
        predictions: [],
        data: {
          text: "Sample text",
        },
      },
    });

    LabelStudio.waitForObjectsReady();

    // Verify we can select annotation by data-annotation-id
    cy.log("Selecting annotation with ID 2002 using data attribute");
    cy.get('[data-annotation-id="2002"]').should("exist").click();

    // Verify the annotation is selected
    cy.get('[data-annotation-id="2002"]').should("have.class", "lsf-annotation-button_selected");

    // Select different annotation
    cy.log("Selecting annotation with ID 2001 using data attribute");
    cy.get('[data-annotation-id="2001"]').should("exist").click();

    // Verify the new annotation is selected and the previous one is not
    cy.get('[data-annotation-id="2001"]').should("have.class", "lsf-annotation-button_selected");
    cy.get('[data-annotation-id="2002"]').should("not.have.class", "lsf-annotation-button_selected");
  });
});
