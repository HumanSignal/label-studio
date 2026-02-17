import { ImageView, LabelStudio } from "@humansignal/frontend-test/helpers/LSF";
import { allLabelsEmptyConfig, allLabelsEmptyData, resultWithNotExistedLabels } from "../../data/config/empty-labels";

describe("Empty labels", () => {
  it("Should retain labels that are not explicitly defined in the configuration", () => {
    LabelStudio.params()
      .config(allLabelsEmptyConfig)
      .data(allLabelsEmptyData)
      .withResult(resultWithNotExistedLabels)
      .init();

    LabelStudio.waitForObjectsReady();
    // Brush region serialization (Region2RLE) needs the Konva stage to be mounted.
    // waitForObjectsReady only checks image file loading, not stage mounting.
    ImageView.waitForImage();

    LabelStudio.serialize().then((results) => {
      const length = results.length;
      expect(length).to.equal(resultWithNotExistedLabels.length);

      for (let i = 0; i < length; i++) {
        const result = results[i];
        const type = result.type;
        expect(result.value[type]).to.deep.equal(resultWithNotExistedLabels[i].value[type]);
      }
    });
  });
});
