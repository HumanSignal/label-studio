import { AudioView, Choices, LabelStudio, Rating, Taxonomy, ToolBar } from "@humansignal/frontend-test/helpers/LSF";
import { FF_DEV_3391, FF_TAXONOMY_ASYNC } from "../../../../src/utils/feature-flags";
import {
  audioConfig,
  audioData,
  audioPerRegionConfig,
  audioResult,
  ratingConfig,
  ratingResult,
  taxonomyConfig,
  taxonomyResult,
  textData,
} from "../../data/view_all/readonly";

beforeEach(() => {
  LabelStudio.addFeatureFlagsOnPageLoad({
    [FF_DEV_3391]: true,
    [FF_TAXONOMY_ASYNC]: true,
  });
});

describe("View all - Raadonly", () => {
  it("Should not allow user to edit an annotation - Rating", () => {
    LabelStudio.params().config(ratingConfig).data(textData).withResult(ratingResult).init();
    ToolBar.viewAllBtn.click();
    Rating.setValue(5);
    Rating.hasValue(3);
  });
  it("Should not allow user to edit an annotation - Taxonomy", () => {
    LabelStudio.params().config(taxonomyConfig).data(textData).withResult(taxonomyResult).init();
    ToolBar.viewAllBtn.click();
    Taxonomy.open();
    Taxonomy.dropdown.should("not.exist");
  });
  it("Should not allow user to edit an annotation - Audio region", () => {
    LabelStudio.params().config(audioConfig).data(audioData).withResult(audioResult).init();
    AudioView.isReady();
    ToolBar.viewAllBtn.click();
    AudioView.isReady();
    AudioView.drawRectRelative(0.07, 0.6, 0.5, 0);
    LabelStudio.serialize().then((result) => {
      expect(result[0].value.start).to.eq(3);
      expect(result[0].value.end).to.eq(10);
    });
  });

  it("Should allow to select an audio region", () => {
    LabelStudio.params().config(audioPerRegionConfig).data(audioData).withResult(audioResult).init();
    AudioView.isReady();
    ToolBar.viewAllBtn.click();
    AudioView.isReady();
    AudioView.clickAtRelative(0.07, 0.6);
    Choices.findChoice("Per-region").should("be.visible");
  });
});
