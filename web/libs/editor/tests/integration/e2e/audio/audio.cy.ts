import { AudioView, LabelStudio } from "@humansignal/frontend-test/helpers/LSF";

describe("Audio", () => {
  // Lock viewport so canvas size matches baseline snapshots (avoids size-mismatch failures).
  // To refresh baselines after UI/canvas changes: CYPRESS_updateSnapshots=true (writes to dist/cypress/.../snapshots).
  beforeEach(() => {
    cy.viewport(2560, 1440);
  });

  it("Renders audio with merged channels by default", () => {
    LabelStudio.params()
      .config(
        `
      <View>
        <Audio name="audio" value="$audio" />
      </View>
      `,
      )
      .data({
        audio: "/public/files/barradeen-emotional.mp3",
      })
      .withResult([])
      .init();

    LabelStudio.waitForObjectsReady();

    AudioView.isReady();
    AudioView.toMatchImageSnapshot(AudioView.drawingArea, { threshold: 0.4 });
  });

  it("Renders separate audio channels with splitchannels=true", () => {
    LabelStudio.params()
      .config(
        `
      <View>
        <Audio name="audio" value="$audio" splitchannels="true" />
      </View>
      `,
      )
      .data({
        audio: "/public/files/barradeen-emotional.mp3",
      })
      .withResult([])
      .init();

    LabelStudio.waitForObjectsReady();

    AudioView.isReady();
    AudioView.toMatchImageSnapshot(AudioView.drawingArea, { threshold: 0.4 });
  });
});
