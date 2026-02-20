import { LabelStudio } from "@humansignal/frontend-test/helpers/LSF";

/**
 * Codecov: TreeValidation.jsx, ConfigValidator.
 * TreeValidation renders when annotationStore.validation has errors (e.g. invalid config).
 */
describe("Tree validation (Codecov: TreeValidation)", () => {
  it("shows validation errors when config has invalid toName reference", () => {
    LabelStudio.params()
      .config(
        `
<View>
  <Image name="img1" value="$image" />
  <RectangleLabels name="tag" toName="img" fillOpacity="0.5" strokeWidth="5">
    <Label value="A" />
  </RectangleLabels>
</View>
`,
      )
      .data({ image: "/public/files/example.jpg" })
      .withResult([])
      .init();

    cy.get(".lsf-errors").should("be.visible");
    cy.get(".lsf-errors").invoke("text").should("not.be.empty");
  });
});
