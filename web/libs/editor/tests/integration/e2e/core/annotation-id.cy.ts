import { LabelStudio } from "@humansignal/frontend-test/helpers/LSF";
import { FF_DEV_3873 } from "../../../../src/utils/feature-flags";

describe("Annotation ID", () => {
  beforeEach(() => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      [FF_DEV_3873]: true,
    });
  });

  it("should have data-annotation-id attribute on all annotation buttons", () => {
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

    // Annotations are displayed in reverse order (newest first)
    // Verify each annotation button has the correct data-annotation-id attribute
    cy.log("Verifying data-annotation-id attributes");
    cy.get('[data-annotation-id="1003"]').should("exist");
    cy.get('[data-annotation-id="1002"]').should("exist");
    cy.get('[data-annotation-id="1001"]').should("exist");

    // Verify the attributes are on the annotation buttons in the correct order
    cy.get(".lsf-annotation-button").eq(0).should("have.attr", "data-annotation-id", "1003");
    cy.get(".lsf-annotation-button").eq(1).should("have.attr", "data-annotation-id", "1002");
    cy.get(".lsf-annotation-button").eq(2).should("have.attr", "data-annotation-id", "1001");
  });

  it("should copy the correct annotation ID to clipboard", () => {
    // Initialize with a single annotation for simpler clipboard testing
    LabelStudio.init({
      config: `<View>
        <Text name="text" value="$text"/>
        <Choices name="choice" toName="text">
          <Choice value="Choice1"/>
        </Choices>
      </View>`,
      task: {
        id: 1,
        annotations: [{ id: 5001, result: [] }],
        predictions: [],
        data: {
          text: "Sample text",
        },
      },
    });

    LabelStudio.waitForObjectsReady();

    // Stub the clipboard API
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, "writeText").resolves();
    });

    // Verify the data-annotation-id attribute matches what gets copied
    cy.get('[data-annotation-id="5001"]').should("exist");

    // Open context menu and copy annotation ID
    cy.get(".lsf-annotation-button__trigger").click();
    cy.get(".lsf-dropdown:visible").find('[class*="option--"]').contains("Copy Annotation ID").click();

    // Verify clipboard was called with the same ID as the data attribute
    cy.window().then((win) => {
      expect(win.navigator.clipboard.writeText).to.have.been.calledWith("5001");
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
