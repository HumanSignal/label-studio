Feature('Readonly Results');

const imageExamples = new DataTable(['example', 'regionName']);

imageExamples.add([require('../../../examples/classification'), 'Walk']);

Data(imageExamples).Scenario('Classification Readonly Results', async ({
  I,
  current,
  LabelStudio,
}) => {
  I.amOnPage('/');
  const { config, result: r, data } = current.example;

  const result = r.map(r => ({ ...r, readonly: true }));

  const params = {
    annotations: [{
      id: 'test',
      result,
    }],
    config,
    data,
  };

  LabelStudio.init(params);

  /**
   * Checking the Number input
   */
  I.say('Checking the Number input');
  I.say('Check number not editable');
  I.seeElement('.lsf-number input:disabled');

  /**
   * Checking the Textarea input
   */
  I.say('Checking the number TextArea');
  I.say('Check textarea is not editable');
  I.seeElement('[aria-label="TextArea Input"]:disabled');
  I.say('Try to input anyways');
  I.fillField('[aria-label="TextArea Input"]', 'Hello world');
  I.pressKey('Enter');

  I.say('Check region is not editable');
  I.dontSee('.lsf-text-area [aria-label="Edit Region"]');

  I.say('Check region is not deletable');
  I.dontSee('.lsf-text-area [aria-label="Delete Region"]');

  /**
   * Checking the Choices
   */
  I.say('Checking the Choices');
  I.seeElement('.lsf-choices input:disabled');

  I.say('Try selecting anyways');
  I.checkOption('Choice 1', '.lsf-choices');

  /**
   * Checking the Taxonomy input
   */
  I.say('Checking the Taxonomy input');
  I.click('Click to add...', '.htx-taxonomy');
  I.seeElement('.htx-taxonomy input:disabled');

  I.say('Checking selected values');
  I.dontSee({ css: '.htx-taxonomy-selected input[type=button]' });

  I.say('Try selecting anyways');
  I.see('Choice 1', '.htx-taxonomy');

  I.say('Results are equal after editing attempt');
  await LabelStudio.resultsNotChanged(result);
});
