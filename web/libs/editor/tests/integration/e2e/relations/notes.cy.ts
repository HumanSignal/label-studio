import { ImageView, LabelStudio, Relations, Sidebar } from "@humansignal/frontend-test/helpers/LSF";

const config = `
  <View>
    <Image name="img" value="$image"></Image>
    <RectangleLabels name="tag" toName="img">
      <Label value="Region1" background="red"></Label>
      <Label value="Region2" background="blue"></Label>
    </RectangleLabels>
    <Relations>
      <Relation value="similar"/>
      <Relation value="different"/>
    </Relations>
  </View>
`;

const image =
  "https://htx-pub.s3.us-east-1.amazonaws.com/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg";

const task = {
  id: 1,
  annotations: [
    {
      id: 1001,
      result: [
        {
          id: "region1",
          source: "$image",
          from_name: "tag",
          to_name: "img",
          type: "rectanglelabels",
          origin: "manual",
          value: {
            height: 10,
            rotation: 0,
            width: 12,
            x: 20,
            y: 20,
            rectanglelabels: ["Region1"],
          },
        },
        {
          id: "region2",
          source: "$image",
          from_name: "tag",
          to_name: "img",
          type: "rectanglelabels",
          origin: "manual",
          value: {
            height: 10,
            rotation: 0,
            width: 12,
            x: 50,
            y: 50,
            rectanglelabels: ["Region2"],
          },
        },
      ],
    },
  ],
  predictions: [],
  data: { image },
};

describe("Relations: Notes", () => {
  it("Should allow adding notes to relations", () => {
    LabelStudio.init({
      config,
      task,
    });

    ImageView.waitForImage();
    Relations.hasRelations(0);

    // Select the first region
    Sidebar.toggleRegionSelection(0);

    // Create a relation
    Relations.toggleCreation();

    // Select the second region
    Sidebar.toggleRegionSelection(1);

    // Check that the relation is created
    Relations.hasRelations(1);

    // Open the relation metadata panel
    cy.get(".lsf-relations__item")
      .first()
      .trigger("mouseover")
      .find('button[aria-label="Show Relation Labels"]')
      .click({ force: true });

    // Find and type in the notes textarea
    cy.get(".lsf-relation-meta__notes").should("be.visible").type("This is a test note for the relation");

    // Verify the note is saved in the serialized output
    LabelStudio.serialize().then((result) => {
      expect(result[2]).to.have.property("type", "relation");
      expect(result[2]).to.have.property("notes", "This is a test note for the relation");
    });
  });

  it("Should persist notes when reloading annotation", () => {
    const taskWithNotes = {
      ...task,
      annotations: [
        {
          ...task.annotations[0],
          result: [
            ...task.annotations[0].result,
            {
              from_id: "region1",
              to_id: "region2",
              type: "relation",
              direction: "right",
              labels: ["similar"],
              notes: "Persisted note content",
            },
          ],
        },
      ],
    };

    LabelStudio.init({
      config,
      task: taskWithNotes,
    });

    ImageView.waitForImage();
    Relations.hasRelations(1);

    // Open the relation metadata panel
    cy.get(".lsf-relations__item")
      .first()
      .trigger("mouseover")
      .find('button[aria-label="Show Relation Labels"]')
      .click({ force: true });

    // Verify the note is displayed
    cy.get(".lsf-relation-meta__notes").should("be.visible").should("have.value", "Persisted note content");
  });
});
