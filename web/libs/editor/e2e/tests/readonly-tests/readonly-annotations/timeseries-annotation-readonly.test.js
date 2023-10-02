Feature('Readonly Annotation');

const imageExamples = new DataTable(['example', 'regionName']);

imageExamples.add([require('../../../examples/timeseries-url-indexed'), 'Walk']);

Data(imageExamples).Scenario('Timeseries Readonly Annotations', async ({
  I,
  current,
  LabelStudio,
  AtSidebar,
  AtLabels,
  Tools,
}) => {
  I.amOnPage('/');
  const { config, result, data } = current.example;
  const regions = result.filter(r => {
    return r.type.match('labels');
  });

  const params = {
    annotations: [{
      id: 'test',
      readonly: true,
      result,
    }],
    config,
    data,
  };

  LabelStudio.init(params);

  I.waitForElement('.htx-timeseries-channel', 60);

  I.say('TimeSeries loaded');

  I.say('Check region is selectable');
  AtSidebar.seeRegions(regions.length);
  AtSidebar.clickRegion(current.regionName);

  I.say('Results are equal after deletion attempt');
  I.pressKey('Backspace');
  await LabelStudio.resultsNotChanged(result);

  const wrapperPosition = await Tools.getElementPosition('.htx-timeseries-channel');

  AtLabels.clickLabel('Run');

  I.say('Can\'t draw new shape');
  I.pressKey('1');
  await I.dragAndDropMouse({
    x: wrapperPosition.x + 100,
    y: wrapperPosition.y + wrapperPosition.height / 2,
  }, {
    x: wrapperPosition.x + 150,
    y: wrapperPosition.y + wrapperPosition.height / 2,
  });

  AtSidebar.seeRegions(regions.length);
});
