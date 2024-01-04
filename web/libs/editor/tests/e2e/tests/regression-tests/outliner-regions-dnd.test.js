Feature('Outliner regions drag and drop').tag('@regress');

const CONFIG = `<View>
    <Labels name="label" toName="text">
        <Label value="Label" background="purple"/>
    </Labels>
    <Text name="text" value="$text" inline="true"/>
</View>`;

const TEXT = 'qwertyuiopasdfghjklzxcvbnm';

function generateResults(n) {
  const results = [];

  for (let k = 0; k < n; k++) {
    results.push({
      id: `${k}`,
      from_name: 'label',
      to_name: 'text',
      type: 'labels',
      origin: 'manual',
      value: {
        start: k,
        end: k + 1,
        text: TEXT.split('')[k],
        labels: [
          'Label',
        ],
      },
    });
  }
  return results;
}

Scenario('Dnd at the outliner after switching annotations', async ({ I, LabelStudio, AtOutliner, AtTopbar }) => {
  I.amOnPage('/');
  LabelStudio.setFeatureFlags({
    ff_front_1170_outliner_030222_short: true,
  });
  LabelStudio.init({
    annotations: [
      {
        id: 'test_02', result: generateResults(10),
      }, 
      {
        id: 'test_01', result: generateResults(10),
      },
    ],
    config: CONFIG,
    data: { text: TEXT },
  });

  AtOutliner.seeRegions(10);

  I.say('Check that drag and drop interaction works');
  await AtOutliner.dragAndDropRegion(7, 3);

  I.say('Switch annotation');
  AtTopbar.openAnnotaions();
  AtTopbar.selectAnnotationAt(2);
  AtOutliner.seeRegions(10);

  I.say('Check that we still able to drag and drop regions');
  await AtOutliner.dragAndDropRegion(7, 3);

  // The potential errors should be caught by `errorsCollector` plugin
});
