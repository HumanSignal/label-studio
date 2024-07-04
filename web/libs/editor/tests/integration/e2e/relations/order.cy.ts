import { ImageView, LabelStudio, Relations, Sidebar, Tooltip } from "@humansignal/frontend-test/helpers/LSF";

const config = `
  <View>
    <Image name="img" value="$image"></Image>
    <RectangleLabels name="tag" toName="img">
      <Label value="Planet"></Label>
      <Label value="Moonwalker" background="blue"></Label>
      <Label value="Moonwalker 1" background="red"></Label>
      <Label value="Moonwalker 2" background="pink"></Label>
      <Label value="Moonwalker 3" background="yellow"></Label>
    </RectangleLabels>
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
          id: "Dx_aB91ISN",
          source: "$image",
          from_name: "tag",
          to_name: "img",
          type: "rectanglelabels",
          origin: "manual",
          value: {
            height: 10.458911419423693,
            rotation: 0,
            width: 12.4,
            x: 50.8,
            y: 5.866,
            rectanglelabels: ["Moonwalker"],
          },
        },
        {
          id: "Dx_aB91INs",
          source: "$image",
          from_name: "tag",
          to_name: "img",
          type: "rectanglelabels",
          origin: "manual",
          value: {
            height: 10.458911419423693,
            rotation: 0,
            width: 12.4,
            x: 50.8,
            y: 25.866,
            rectanglelabels: ["Moonwalker 2"],
          },
        },
        {
          id: "Dx_aB91ANs",
          source: "$image",
          from_name: "tag",
          to_name: "img",
          type: "rectanglelabels",
          origin: "manual",
          value: {
            height: 10.458911419423693,
            rotation: 0,
            width: 12.4,
            x: 50.8,
            y: 45.866,
            rectanglelabels: ["Moonwalker 3"],
          },
        },
        {
          id: "Dx_aB19ISN",
          source: "$image",
          from_name: "tag",
          to_name: "img",
          type: "rectanglelabels",
          origin: "manual",
          value: {
            height: 10.458911419423693,
            rotation: 0,
            width: 12.4,
            x: 50.8,
            y: 65.866,
            rectanglelabels: ["Planet"],
          },
        },
      ],
    },
  ],
  predictions: [],
  data: { image },
};

describe("Relations: Sort Order all relations", () => {
  beforeEach(() => {
    LabelStudio.init({ config, task });
    ImageView.waitForImage();
    Relations.hasRelations(0);
  });

  it("should exist and be disabled without existed relations", () => {
    Relations.ascendingOrderRelationButton.should("be.visible").should("be.disabled");
  });

  it("should exist and be enabled with existed relations", () => {
    Sidebar.toggleRegionSelection(0);
    Relations.toggleCreation();
    ImageView.clickAtRelative(0.51, 0.26);
    Relations.hasRelations(1);
    Relations.hasRelation("Moonwalker", "Moonwalker 2");
    ImageView.clickAtRelative(0.51, 0.06);
    Relations.toggleCreation();
    ImageView.clickAtRelative(0.51, 0.46);
    Relations.hasRelations(2);
    Relations.hasRelation("Moonwalker", "Moonwalker 3");
    ImageView.clickAtRelative(0.51, 0.66);
    Relations.toggleCreation();
    ImageView.clickAtRelative(0.51, 0.06);
    Relations.hasRelations(3);
    Relations.ascendingOrderRelationButton.should("be.visible").should("be.enabled");
  });

  it("should sort relations in ascending order and descending order", () => {
    Sidebar.toggleRegionSelection(0);
    Relations.toggleCreation();
    ImageView.clickAtRelative(0.51, 0.26);
    Relations.hasRelations(1);
    Relations.hasRelation("Moonwalker", "Moonwalker 2");
    ImageView.clickAtRelative(0.51, 0.06);
    Relations.toggleCreation();
    ImageView.clickAtRelative(0.51, 0.46);
    Relations.hasRelations(2);
    Relations.hasRelation("Moonwalker", "Moonwalker 3");
    ImageView.clickAtRelative(0.51, 0.66);
    Relations.toggleCreation();
    ImageView.clickAtRelative(0.51, 0.06);
    Relations.hasRelations(3);
    Relations.hasRelation("Planet", "Moonwalker");

    Relations.relationOrderList.should("deep.equal", [
      { from: "Moonwalker", to: "Moonwalker 2" },
      { from: "Moonwalker", to: "Moonwalker 3" },
      { from: "Planet", to: "Moonwalker" },
    ]);

    Relations.ascendingOrderRelationButton.click({ force: true });

    Relations.relationOrderList.should("deep.equal", [
      { from: "Planet", to: "Moonwalker" },
      { from: "Moonwalker", to: "Moonwalker 3" },
      { from: "Moonwalker", to: "Moonwalker 2" },
    ]);

    Relations.descendingOrderRelationButton.click({ force: true });

    Relations.relationOrderList.should("deep.equal", [
      { from: "Moonwalker", to: "Moonwalker 2" },
      { from: "Moonwalker", to: "Moonwalker 3" },
      { from: "Planet", to: "Moonwalker" },
    ]);
  });

  it("should have tooltip for ascending action", () => {
    Sidebar.toggleRegionSelection(0);
    Relations.toggleCreation();
    ImageView.clickAtRelative(0.51, 0.26);
    Relations.hasRelations(1);
    Relations.hasRelation("Moonwalker", "Moonwalker 2");

    Relations.ascendingOrderRelationButton.trigger("mouseenter");
    Tooltip.hasText("Order by oldest");
  });
});
