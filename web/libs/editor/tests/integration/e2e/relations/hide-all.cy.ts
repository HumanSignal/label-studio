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

describe("Relations: Hide/Show all relations", () => {
  beforeEach(() => {
    LabelStudio.init({ config, task });
    ImageView.waitForImage();
    Relations.hasRelations(0);
  });

  it("should exist and be disabled without existed relations", () => {
    Relations.showAllRelationsButton.should("be.visible").should("be.disabled");
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
    Relations.hideAllRelationsButton.should("be.visible").should("be.enabled");
  });

  it("should hide all relations", () => {
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
    Relations.hasHiddenRelations(0);
    Relations.hideAllRelationsButton.click({ force: true });
    Relations.hasHiddenRelations(3);
  });

  it("should show all relations", () => {
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
    Relations.hasHiddenRelations(0);
    Relations.hideAllRelationsButton.click({ force: true });
    Relations.hasHiddenRelations(3);
    Relations.showAllRelationsButton.click({ force: true });
    Relations.hasHiddenRelations(0);
  });

  it("should show rest relations", () => {
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
    Relations.toggleRelationVisibility(1);
    Relations.hasHiddenRelations(1);
    Relations.showAllRelationsButton.click({ force: true });
    Relations.hasHiddenRelations(0);
  });

  it("should have tooltip for hide action", () => {
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

    Relations.hideAllRelationsButton.trigger("mouseenter");
    Tooltip.hasText("Hide all");
  });
});
