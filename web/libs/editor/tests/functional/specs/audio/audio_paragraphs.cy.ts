import { AudioView, LabelStudio, Sidebar } from '@heartexlabs/ls-test/helpers/LSF/index';
import * as audioFixtures from 'data/audio/audio_paragraphs';
import { FF_LSDV_E_278 } from '../../../../src/utils/feature-flags';

describe('Audio: Paragraphs Sync', () => {
  beforeEach(() => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      [FF_LSDV_E_278]: true,
    });
  });

  it('Correctly loads with Paragraph segments as Audio segments', () => {
    LabelStudio.params()
      .config(audioFixtures.config)
      .data(audioFixtures.data)
      .withResult(audioFixtures.result)
      .init();

    LabelStudio.waitForObjectsReady();

    Sidebar.hasRegions(4);

    AudioView.isReady();
    AudioView.toMatchImageSnapshot(AudioView.drawingArea, { threshold: 0.4 });
  });

  it('Highlights the correct Audio segment whenever it is played or seeked', () => {
    LabelStudio.params()
      .config(audioFixtures.config)
      .data(audioFixtures.data)
      .withResult(audioFixtures.result)
      .init();

    LabelStudio.waitForObjectsReady();

    Sidebar.hasRegions(4);

    AudioView.isReady();

    AudioView.seekCurrentTimebox(14);
    AudioView.toMatchImageSnapshot(AudioView.drawingArea, { name: 'HighlightOnFirstSeek', threshold: 0.4 });
    AudioView.play(undefined, 6);
    AudioView.toMatchImageSnapshot(AudioView.drawingArea, { name: 'HighlightAfterFinishedPlayback', threshold: 0.4 });
  });
});
