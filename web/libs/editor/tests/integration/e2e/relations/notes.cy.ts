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

describe("Relations: Select type of relation & write notes", () => {
  beforeEach(() => {
    LabelStudio.init({ config, task });
    ImageView.waitForImage();
    Relations.hasRelations(0);
  });  

  it("should exist and be enabled to select the sort of relation and create notes/description", () => {
    ImageView.waitForImage();
        Relations.hasRelations(0);
        Sidebar.toggleRegionSelection(0);
        Relations.toggleCreationWithHotkey();
        ImageView.clickAtRelative(0.51, 0.26);
        Relations.hasRelations(1);
        Relations.hasRelation("Moonwalker", "Moonwalker 2");
        Relations.mouseOverRelation();
        Relations.toggleMeta();
        Relations.hasSelect();
        Relations.toggleNote();
        Relations.hasNote();
        Relations.writeNote();
        Relations.hasNoteText();
  });
 
});
