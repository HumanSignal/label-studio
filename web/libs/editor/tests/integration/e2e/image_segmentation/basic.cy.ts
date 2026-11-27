import { ImageView, Labels, LabelStudio, Sidebar } from "@humansignal/frontend-test/helpers/LSF";

const config = `
  <View>
    <Image name="img" value="$image"></Image>
    <RectangleLabels name="tag" toName="img">
      <Label value="Planet"></Label>
      <Label value="Moonwalker" background="blue"></Label>
    </RectangleLabels>
  </View>
`;

const image =
  "https://htx-pub.s3.us-east-1.amazonaws.com/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg";

describe("Basic Image scenario", () => {
  it("Should be able to draw a simple rectangle", () => {
    LabelStudio.params().config(config).data({ image }).withResult([]).init();

    LabelStudio.waitForObjectsReady();
    ImageView.waitForImage();
    Sidebar.hasNoRegions();

    Labels.select("Planet");
    ImageView.drawRectRelative(0.05, 0.05, 0.2, 0.2);

    Sidebar.hasRegions(1);
  });
});
