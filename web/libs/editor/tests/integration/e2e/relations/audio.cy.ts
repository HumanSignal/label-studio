import { AudioView, LabelStudio, Relations } from "@humansignal/frontend-test/helpers/LSF";
import { audioWithFourRegionsResult, audioWithLabelsConfig, audioWithLabelsData } from "../../data/relations/audio";

describe("Relations: Audio", () => {
  it("Should be able to create a relation", () => {
    LabelStudio.params()
      .config(audioWithLabelsConfig)
      .data(audioWithLabelsData)
      .withResult(audioWithFourRegionsResult)
      .init();

    AudioView.isReady();

    AudioView.clickAtRelative(0.4, 0.5);
    Relations.toggleCreationWithHotkey();
    AudioView.clickAtRelative(0.2, 0.5);
  });

  it("Should not display relations out of the viewport", () => {
    LabelStudio.params()
      .config(audioWithLabelsConfig)
      .data(audioWithLabelsData)
      .withResult(audioWithFourRegionsResult)
      .init();

    AudioView.isReady();

    AudioView.clickAtRelative(0.4, 0.5);
    Relations.toggleCreation();
    AudioView.clickAtRelative(0.2, 0.5);

    AudioView.clickAtRelative(0.4, 0.5);
    Relations.toggleCreation();
    AudioView.clickAtRelative(0.6, 0.5);

    AudioView.clickAtRelative(0.6, 0.5);
    Relations.toggleCreation();
    AudioView.clickAtRelative(0.8, 0.5);

    Relations.overlayItems.should("have.length", 3);

    AudioView.zoomIn({ times: 2 });
    Relations.overlayItems.should("have.length", 1);

    AudioView.scroll({ times: 3, speed: 300 });
    Relations.overlayItems.should("have.length", 1);

    AudioView.zoomIn({ times: 2 });
    Relations.overlayItems.should("have.length", 0);
  });
});
