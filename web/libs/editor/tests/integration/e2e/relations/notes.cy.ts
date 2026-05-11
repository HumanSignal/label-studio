import { ImageView, LabelStudio, Relations, Sidebar } from "@humansignal/frontend-test/helpers/LSF";

const config = `
  <View>
    <Image name="img" value="$image"></Image>
    <RectangleLabels name="tag" toName="img">
      <Label value="Region 1" background="red"></Label>
      <Label value="Region 2" background="blue"></Label>
    </RectangleLabels>
    <Relations>
      <Relation value="similar"/>
      <Relation value="different"/>
    </Relations>
  </View>
`;

const configWithoutRelationLabels = `
  <View>
    <Image name="img" value="$image"></Image>
    <RectangleLabels name="tag" toName="img">
      <Label value="Region 1" background="red"></Label>
      <Label value="Region 2" background="blue"></Label>
    </RectangleLabels>
  </View>
`;

const image =
  "https://htx-pub.s3.us-east-1.amazonaws.com/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg";

const baseResult = [
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
      rectanglelabels: ["Region 1"],
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
      rectanglelabels: ["Region 2"],
    },
  },
];

const task = {
  id: 1,
  annotations: [
    {
      id: 1001,
      result: baseResult,
    },
  ],
  predictions: [],
  data: { image },
};

const openRelationMetadata = () => {
  cy.get(".lsf-relations__item")
    .first()
    .trigger("mouseover")
    .find('button[aria-label="Show Relation Details"]')
    .click({ force: true });
};

describe("Relations: Notes", () => {
  it("serializes note text added to a relation", () => {
    LabelStudio.init({ config, task });

    ImageView.waitForImage();
    Relations.hasRelations(0);

    Sidebar.toggleRegionSelection(0);
    Relations.toggleCreation();
    Sidebar.toggleRegionSelection(1);
    Relations.hasRelations(1);

    openRelationMetadata();
    cy.get('[aria-label="Relation note"]').type("Needs clinical review before export");

    LabelStudio.serialize().then((result) => {
      expect(result[2]).to.include({
        type: "relation",
        from_id: "region1",
        to_id: "region2",
        notes: "Needs clinical review before export",
      });
    });
  });

  it("loads existing relation notes into the metadata panel", () => {
    LabelStudio.init({
      config,
      task: {
        ...task,
        annotations: [
          {
            ...task.annotations[0],
            result: [
              ...baseResult,
              {
                from_id: "region1",
                to_id: "region2",
                type: "relation",
                direction: "right",
                labels: ["similar"],
                notes: "Already reviewed",
              },
            ],
          },
        ],
      },
    });

    ImageView.waitForImage();
    Relations.hasRelations(1);

    openRelationMetadata();
    cy.get('[aria-label="Relation note"]').should("have.value", "Already reviewed");
  });

  it("allows notes when relation labels are not configured", () => {
    LabelStudio.init({ config: configWithoutRelationLabels, task });

    ImageView.waitForImage();
    Relations.hasRelations(0);

    Sidebar.toggleRegionSelection(0);
    Relations.toggleCreation();
    Sidebar.toggleRegionSelection(1);
    Relations.hasRelations(1);

    openRelationMetadata();
    cy.get('[aria-label="Relation note"]').type("No label taxonomy needed");

    LabelStudio.serialize().then((result) => {
      expect(result[2]).to.include({
        type: "relation",
        from_id: "region1",
        to_id: "region2",
        notes: "No label taxonomy needed",
      });
      expect(result[2]).not.to.have.property("labels");
    });
  });
});
