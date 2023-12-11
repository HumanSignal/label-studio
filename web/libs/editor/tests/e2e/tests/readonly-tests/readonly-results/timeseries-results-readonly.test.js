Feature('Readonly Results');

const imageExamples = new DataTable(['example', 'regionName']);

imageExamples.add([require('../../../examples/timeseries-url-indexed'), 'Run']);

Data(imageExamples).Scenario('Timeseries Readonly Results', async ({
  I,
  current,
  LabelStudio,
  AtSidebar,
  AtLabels,
  Tools,
}) => {
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

  I.waitForElement('.htx-timeseries-channel', 60);

  I.say('TimeSeries loaded');

  I.say('Check region is selectable');
  AtSidebar.seeRegions(regions.length);
  AtSidebar.clickRegion(current.regionName);

  I.say('Results are equal after deletion attempt');
  I.pressKey('Backspace');
  await LabelStudio.resultsNotChanged(result);

  const wrapperPosition = await Tools.getElementPosition('.htx-timeseries-channel .overlay');

  AtLabels.clickLabel('Run');

  I.pressKey('u');
  I.say('Can draw new shape');
  I.pressKey('1');
  await I.dragAndDropMouse({
    x: wrapperPosition.x + 50,
    y: wrapperPosition.y + wrapperPosition.height / 2,
  }, {
    x: wrapperPosition.x + 300,
    y: wrapperPosition.y + wrapperPosition.height / 2,
  });

  AtSidebar.seeRegions(regions.length + 1);
});
