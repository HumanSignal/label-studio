Feature('Readonly Regions');

const imageExamples = new DataTable(['example', 'regionIndex']);

imageExamples.add([require('../../../examples/audio-regions'), 1]);

Data(imageExamples).Scenario('Audio Readonly Regions', async ({
  I,
  current,
  LabelStudio,
  AtOutliner,
  AtAudioView,
}) => {
  LabelStudio.setFeatureFlags({
    ff_front_dev_2715_audio_3_280722_short: true,
    ff_front_1170_outliner_030222_short: true,
  });

  I.amOnPage('/');
  const { config, result: r, data } = current.example;

  // mark first result as readonly
  const result = r.map((r, i) => i === 0 ? { ...r, readonly: true } : r);

  // extracts label regions only
  const regions = result.filter(r => r.type.match('labels'));

  LabelStudio.init({
    annotations: [{
      id: 'test',
      result,
    }],
    config,
    data,
  });

  await AtAudioView.waitForAudio();
  await AtAudioView.lookForStage();

  I.say('Check region is selectable');
  AtOutliner.seeRegions(regions.length);
  AtOutliner.clickRegion(current.regionIndex);

  I.say('Attempt to move a readonly region');
  const readonlyRegionId = regions[0].id;

  await AtAudioView.moveRegionV3(readonlyRegionId, 100);

  I.say('Results are equal after modification attempt');
  await LabelStudio.resultsNotChanged(result);

  I.say('Attempt to move a non-readonly region (and it will be selected after this)');
  const nonReadonlyRegionId = regions[1].id;

  await AtAudioView.moveRegionV3(nonReadonlyRegionId, 100);

  I.say('Results are not equal after modification attempt');
  await LabelStudio.resultsChanged(result);

  I.pressKey('CommandOrControl+z');
  AtOutliner.clickRegion(current.regionIndex);
  I.pressKey('Backspace');
  I.say('Results are equal after attempt to delete readonly region');
  await LabelStudio.resultsNotChanged(result);

  // There was a test that we can draw over readonly region,
  // but that's not the case fo v3 anymore, so it was removed.
});
