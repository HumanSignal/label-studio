/* global Feature, Scenario */

const assert = require('assert');

Feature('Sync: Multiple Audio');

const config = `
<View>
  <Audio name="audio" value="$url" hotkey="space" sync="v1" />
  <Audio name="audio2" value="$url" hotkey="space" sync="v1" />
</View>
`;

const data = {
  url: 'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/audio/barradeen-emotional.mp3',
};

const annotations = [];

const params = {  annotations: [{ id: 'test', result: annotations }], config, data };

Scenario('Play/pause of multiple synced audio stay in sync', async function({ I, LabelStudio, AtAudioView }) {
  LabelStudio.setFeatureFlags({
    fflag_feat_front_dev_2461_audio_paragraphs_seek_chunk_position_short: true,
    ff_front_dev_2715_audio_3_280722_short: true,
    fflag_feat_front_lsdv_3012_syncable_tags_070423_short: true,
  });

  I.amOnPage('/');

  LabelStudio.init(params);

  await AtAudioView.waitForAudio();
  await AtAudioView.lookForStage();

  {
    const [{ currentTime: audioTime1 }, { currentTime: audioTime2 }] = await AtAudioView.getCurrentAudio();

    assert.equal(audioTime1, audioTime2);
    assert.equal(audioTime1, 0);
  }

  AtAudioView.clickPlayButton();
  I.wait(1);
  {
    const [{ paused: audioPaused1 }, { paused: audioPaused2 }] = await AtAudioView.getCurrentAudio();

    assert.equal(audioPaused1, audioPaused2);
    assert.equal(audioPaused1, false);
  }

  I.wait(1);
  AtAudioView.clickPauseButton();
  I.wait(1);
  {
    const [{ currentTime: audioTime1, paused: audioPaused1 }, { currentTime: audioTime2, paused: audioPaused2 }] = await AtAudioView.getCurrentAudio();

    assert.equal(audioPaused1, audioPaused2);
    assert.equal(audioPaused1, true);
    assert.equal(Math.abs(audioTime1 - audioTime2) < 0.3, true, `Audio 1 currentTime and audio 2 currentTime drifted too far. Got audio1=${audioTime1} audio2=${audioTime2}`);
    assert.notEqual(audioTime1, 0);
    assert.notEqual(audioTime2, 0);
  }
});


Scenario('Looping of multiple synced audio stay in sync', async function({ I, LabelStudio, AtAudioView }) {
  LabelStudio.setFeatureFlags({
    fflag_feat_front_dev_2461_audio_paragraphs_seek_chunk_position_short: true,
    ff_front_dev_2715_audio_3_280722_short: true,
    fflag_feat_front_lsdv_3012_syncable_tags_070423_short: true,
  });

  I.amOnPage('/');

  LabelStudio.init(params);

  await AtAudioView.waitForAudio();
  await AtAudioView.lookForStage();

  I.say('Draw an audio segment to start looping');
  AtAudioView.dragAudioElement(160, 80);
  {
    const [{ paused: audioPaused1, currentTime: audioTime1 }, { paused: audioPaused2, currentTime: audioTime2 }] = await AtAudioView.getCurrentAudio();

    I.say('Audio is playing');

    // Check that the audio timing is within 0.3 seconds of each other (to account for rounding errors, and the fact
    // that playback timers will not be perfectly precise)
    assert.notEqual(audioTime1, 0);
    assert.notEqual(audioTime2, 0);
    assert.ok(Math.abs(audioTime1 - audioTime2) < 0.3, `Audio time difference has drifted by ${(audioTime1 - audioTime2) * 1000}ms`);

    assert.equal(audioPaused1, audioPaused2);
    assert.equal(audioPaused1, false);
  }

  I.say('Audio played to the same point in time');
  AtAudioView.clickPauseButton();
  {
    const [{ paused: audioPaused1, currentTime: audioTime1 }, { paused: audioPaused2, currentTime: audioTime2 }] = await AtAudioView.getCurrentAudio();

    I.say('Audio is paused');

    assert.equal(audioPaused1, audioPaused2);
    assert.equal(audioPaused1, true);
    assert.ok(Math.abs(audioTime1 - audioTime2) < 0.3, `Audio time difference has drifted by ${(audioTime1 - audioTime2) * 1000}ms`);
    assert.notEqual(audioTime1, 0);
    assert.notEqual(audioTime2, 0);
  }


  I.say('Clicking outside of the audio segment and then clicking play should restart the audio from the beginning of the segment');
  AtAudioView.clickAt(250);
  AtAudioView.clickPlayButton();
  {
    const [{ paused: audioPaused1, currentTime: audioTime1 }, { paused: audioPaused2, currentTime: audioTime2 }] = await AtAudioView.getCurrentAudio();

    I.say('Audio is playing');

    assert.equal(audioPaused1, audioPaused2);
    assert.equal(audioPaused1, false);
    assert.ok(Math.abs(audioTime1 - audioTime2) < 0.3, `Audio time difference has drifted by ${(audioTime1 - audioTime2) * 1000}ms`);
    assert.notEqual(audioTime1, 0);
    assert.notEqual(audioTime2, 0);
  }
});

Scenario('Seeking of multiple synced audio stay in sync', async function({ I, LabelStudio, AtAudioView }) {
  LabelStudio.setFeatureFlags({
    fflag_feat_front_dev_2461_audio_paragraphs_seek_chunk_position_short: true,
    ff_front_dev_2715_audio_3_280722_short: true,
    fflag_feat_front_lsdv_3012_syncable_tags_070423_short: true,
  });

  I.amOnPage('/');

  LabelStudio.init(params);

  await AtAudioView.waitForAudio();
  await AtAudioView.lookForStage();
  {
    const [{ currentTime: audioTime1 }, { currentTime: audioTime2 }] = await AtAudioView.getCurrentAudio();

    assert.equal(audioTime1, audioTime2);
    assert.equal(audioTime1, 0);
  }

  AtAudioView.clickAt(100);
  {
    const [{ currentTime: audioTime1 }, { currentTime: audioTime2 }] = await AtAudioView.getCurrentAudio();

    assert.equal(audioTime1, audioTime2);
    assert.notEqual(audioTime1, 0);
  }

  AtAudioView.clickAtBeginning();
  {
    const [{ currentTime: audioTime1 }, { currentTime: audioTime2 }] = await AtAudioView.getCurrentAudio();

    assert.equal(audioTime1, audioTime2);
    assert.equal(audioTime1, 0);
  }

  AtAudioView.clickAtEnd();
  {
    const [{ currentTime: audioTime1 }, { currentTime: audioTime2, duration }] = await AtAudioView.getCurrentAudio();

    assert.equal(audioTime1, audioTime2);
    assert.equal(audioTime1, duration);
  }

  AtAudioView.clickAt(300);
  {
    const [{ currentTime: audioTime1 }, { currentTime: audioTime2 }] = await AtAudioView.getCurrentAudio();

    assert.equal(audioTime1, audioTime2);
    assert.notEqual(audioTime1, 0);
  }
});
