Feature('Readonly Annotation');

const imageExamples = new DataTable(['example', 'regionName']);

imageExamples.add([require('../../../examples/text-html'), 'Date']);

Data(imageExamples).Scenario('NER Readonly Results', async ({
  I,
  current,
  LabelStudio,
  AtSidebar,
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

  I.say('Check region is selectable');
  AtSidebar.seeRegions(regions.length);

  I.say('Attempt to delete a readonly region');
  AtSidebar.clickRegion('Date');
  I.pressKey('Backspace');
  I.say('Results are equal after deletion attempt');
  await LabelStudio.resultsNotChanged(result);

  // Person
  I.say('Attempt to delete a non-readonly region');
  AtSidebar.clickRegion('Person');
  I.pressKey('Backspace');
  I.say('Results are not equal after deletion attempt');
  await LabelStudio.resultsChanged(result);
  I.pressKey('CommandOrControl+z');

  I.say('Can draw new shape');
  I.pressKey('1');

  AtSidebar.seeRegions(regions.length);
});
