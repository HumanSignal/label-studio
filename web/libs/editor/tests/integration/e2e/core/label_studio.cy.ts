import { LabelStudio } from "@humansignal/frontend-test/helpers/LSF";
import { FF_SIMPLE_INIT } from "libs/editor/src/utils/feature-flags";

describe("Label Studio UI init", () => {
  it("Initialize empty Label Studio", () => {
    LabelStudio.init({
      config: "<View></View>",
      task: {
        annotations: [],
        predictions: [],
        id: 1,
        data: {
          image:
            "https://htx-pub.s3.us-east-1.amazonaws.com/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg",
        },
      },
    });
    cy.contains("No more annotations").should("be.visible");
  });

  it("Initialize Label Studio", () => {
    LabelStudio.init({
      config: "<View></View>",
      task: {
        annotations: [{ id: 1, result: [] }],
        predictions: [],
        id: 1,
        data: {
          image:
            "https://htx-pub.s3.us-east-1.amazonaws.com/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg",
        },
      },
    });
    cy.contains("Labeled regions will appear here").should("be.visible");
  });

  it("Initialize Label Studio with simple init FF (LEAP-443)", () => {
    const callApi = cy.spy().as("callApi");

    // testing new UI with simple init FF
    LabelStudio.setFeatureFlagsOnPageLoad({
      [FF_SIMPLE_INIT]: true,
    });

    LabelStudio.init({
      onSubmitAnnotation: (annotation: object) => {
        callApi(annotation);
      },
      config: "<View></View>",
      task: {
        annotations: [
          { id: 1, result: [] },
          { id: 2, result: [] },
        ],
        predictions: [],
        id: 1,
        data: {
          image:
            "https://htx-pub.s3.us-east-1.amazonaws.com/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg",
        },
      },
    });
    cy.contains("Labeled regions will appear here").should("be.visible");
    // we already have an annotation, so we should have Update button and no Submit button
    cy.contains("Update").should("be.visible");
    cy.contains("Submit").should("not.exist");

    // now we create a new annotation and submit it
    cy.get('[aria-label="Create an annotation"]').click();
    cy.contains("Update").should("not.exist");
    cy.contains("Submit").should("be.visible");

    // submit by hotkey
    cy.get("body").type(Cypress.platform === "darwin" ? "{cmd}{enter}" : "{ctrl}{enter}");

    // we should have called the API once
    cy.get("@callApi").should("have.been.calledOnce");

    // @todo technically we should have Update button and no Submit button again,
    // @todo but currently this logic is crazy and we reload task in LSO/LSE anyway;
    // @todo so at least we check that there is only one of these two buttons.
    cy.contains("Submit").should("be.visible");
    cy.contains("Update").should("not.exist");
  });
});
