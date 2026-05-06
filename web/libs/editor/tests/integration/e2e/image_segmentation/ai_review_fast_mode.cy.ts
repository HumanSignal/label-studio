import { ImageView, LabelStudio, Sidebar } from "@humansignal/frontend-test/helpers/LSF";

const image =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0id2hpdGUiLz48L3N2Zz4=";
const mask =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgZmlsbD0iYmxhY2siLz48L3N2Zz4=";

const config = `
  <View>
    <Image name="img" value="$image" />
    <BrushLabels name="tag" toName="img">
      <Label value="Object" background="#ff0000" />
    </BrushLabels>
  </View>
`;

const result = Array.from({ length: 8 }, (_, index) => ({
  id: `brush-${index}`,
  source: "$image",
  from_name: "tag",
  to_name: "img",
  type: "brushlabels",
  original_width: 100,
  original_height: 100,
  image_rotation: 0,
  value: {
    format: "rle",
    brushlabels: ["Object"],
    maskDataURL: mask,
  },
  meta: {
    bbox: {
      x: 10 + index,
      y: 10 + index,
      width: 40,
      height: 40,
    },
  },
}));

describe("Image Segmentation - AI Review Fast Mode", () => {
  it("loads dense brush regions as static overlays and allows review click-through", () => {
    LabelStudio.params()
      .config(config)
      .data({ image })
      .withResult(result)
      .withParam("forceAiReviewFastMode", true)
      .init();

    ImageView.waitForImage();
    Sidebar.hasRegions(result.length);

    cy.window().then((win) => {
      expect(win.Htx.aiReviewFastMode).to.equal(true);
      const regions = win.Htx.annotationStore.selected.regionStore.regions;

      expect(regions).to.have.length(result.length);
      expect(regions.every((region) => region.type === "brushregion")).to.equal(true);
      expect(regions.every((region) => region.imageData === null)).to.equal(true);
      expect(regions[0].bboxCoordsCanvas).to.deep.equal({ left: 10, top: 10, right: 50, bottom: 50 });
    });

    ImageView.clickAtRelative(0.25, 0.25);
    Sidebar.hasSelectedRegions(0);

    Sidebar.toggleRegionSelection(0);
    Sidebar.hasSelectedRegions(1);
  });
});
