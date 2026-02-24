import { LabelStudio } from "@humansignal/frontend-test/helpers/LSF";

/**
 * TreeValidation renders when annotationStore.validation has errors (e.g. invalid config).
 */
describe("Tree validation", () => {
  it("shows validation errors when config has invalid toName reference (ERR_TAG_NOT_FOUND)", () => {
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
    cy.get(".lsf-errors").invoke("text").should("include", "img");
  });

  it("shows validation errors when toName references wrong tag type (ERR_TAG_UNSUPPORTED)", () => {
    LabelStudio.params()
      .config(
        `
<View>
  <Text name="txt" value="$text" />
  <RectangleLabels name="tag" toName="txt" fillOpacity="0.5" strokeWidth="5">
    <Label value="A" />
  </RectangleLabels>
</View>
`,
      )
      .data({ text: "Hello" })
      .withResult([])
      .init();

    cy.get(".lsf-errors").should("be.visible");
    cy.get(".lsf-errors").invoke("text").should("not.be.empty");
  });

  it("shows validation errors when attribute has invalid type (ERR_BAD_TYPE)", () => {
    LabelStudio.params()
      .config(
        `
<View>
  <Image name="img" value="$image" />
  <RectangleLabels name="tag" toName="img" fillOpacity="-1" strokeWidth="5">
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
