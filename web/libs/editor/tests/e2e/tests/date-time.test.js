const assert = require('assert');
const { formatDateValue } = require('../helpers/DateTime');
const { serialize, selectText } = require('./helpers');

Feature('Date Time');

const config = `<View>
<Header>Select text to see related smaller DateTime controls for every region</Header>
<Labels name="label" toName="text">
  <Label value="birth" background="green"/>
  <Label value="death" background="red"/>
  <Label value="event" background="orange"/>
</Labels>
<Text name="text" value="$text"/>
<DateTime name="created" toName="text" required="true" only="date" format="%d.%m.%Y" min="1988-01-13" max="1999-12-31"/>
<View visibleWhen="region-selected">
  <Header>Date in this fragment, required, stored as ISO date</Header>
  <DateTime name="date" toName="text" perRegion="true" only="date" required="true" format="%Y-%m-%d"/>
  <Header>Year this happened, but stored also as ISO date</Header>
  <DateTime name="year" toName="text" perRegion="true" only="year" format="%Y-%m-%d" min="2020" max="2022"/>
</View>
</View>
`;

const data = {
  text: 'Albert Einstein (/ˈaɪnstaɪn/ EYEN-styne;[6] German: [ˈalbɛʁt ˈʔaɪnʃtaɪn] (listen); 14 March 1879 – 18 April 1955) was a German-born theoretical physicist,[7] widely acknowledged to be one of the greatest and most influential physicists of all time. Einstein is best known for developing the theory of relativity, but he also made important contributions to the development of the theory of quantum mechanics. Relativity and quantum mechanics are together the two pillars of modern physics.[3][8] His mass–energy equivalence formula E = mc2, which arises from relativity theory, has been dubbed "the world\'s most famous equation".[9] His work is also known for its influence on the philosophy of science.[10][11] He received the 1921 Nobel Prize in Physics "for his services to theoretical physics, and especially for his discovery of the law of the photoelectric effect",[12] a pivotal step in the development of quantum theory. His intellectual achievements and originality resulted in "Einstein" becoming synonymous with "genius".[13]',
};

const createdDate = {
  incorrectMin: '1988-01-12',
  correctMin: '1988-01-13',
  incorrectMax: '2000-01-01',
  correctMax: '1999-12-31',
  result: '31.12.1999',
};

const regions = [
  { label: 'birth', rangeStart: 83, rangeEnd: 96, text: '14 March 1879', dateValue: '1879-03-14', year: '2022' },
  { label: 'death', rangeStart: 99, rangeEnd: 112, text: '18 April 1955', dateValue: '1955-04-18', year: '2021' },
  { label: 'event', rangeStart: 728, rangeEnd: 755, text: '1921 Nobel Prize in Physics', dateValue: '1921-10-10', year: '2020' },
];

const params = { config, data };

Scenario('Check DateTime holds state between annotations and saves result', async function({ I, AtDateTime, AtLabels, AtSidebar, LabelStudio }) {
  I.amOnPage('/');

  LabelStudio.init(params);

  // detect format used for html5 date inputs
  const format = await AtDateTime.detectDateFormat();

  I.say(`System format is ${format}`);

  ////// GLOBAL
  I.say('Check validation of required global date control');
  I.updateAnnotation();
  I.see('DateTime "created" is required');
  I.click('OK');

  const checks = {
    incorrect: [
      [createdDate.incorrectMin, 'min date is 1988-01-13'],
      [createdDate.incorrectMax, 'max date is 1999-12-31'],
    ],
    correct: [
      [createdDate.correctMin],
      [createdDate.correctMax],
    ],
  };

  for (const [incorrect, error] of checks.incorrect) {
    I.fillField('input[type=date]', formatDateValue(incorrect, format));
    I.updateAnnotation();
    I.see('is not valid');
    I.see(error);
    I.click('OK');
    assert.strictEqual(await I.grabCssPropertyFrom('[type=date]', 'border-color'), 'rgb(255, 0, 0)');
  }

  for (const [correct] of checks.correct) {
    I.fillField('input[type=date]', formatDateValue(correct, format));
    I.updateAnnotation();
    I.dontSee('Warning');
    I.dontSee('is not valid');
  }

  // this value will be asserted at the end
  I.fillField('input[type=date]', formatDateValue(createdDate.correctMax, format));

  ////// PER-REGION
  I.say('Create regions but leave dates empty');
  for (const region of regions) {
    AtLabels.clickLabel(region.label);
    AtLabels.seeSelectedLabel(region.label);
    await I.executeScript(selectText, {
      selector: '.lsf-htx-richtext',
      rangeStart: region.rangeStart,
      rangeEnd: region.rangeEnd,
    });
    I.pressKey('Escape');
    // to prevent from double-click region handling (its timeout is 0.45s)
    I.wait(0.5);
  }

  I.say('Try to submit and observe validation errors about per-regions');
  I.updateAnnotation();
  I.see('DateTime "date" is required');
  I.click('OK');

  // invalid region is selected on validation to reveal per-region control with error
  AtSidebar.seeSelectedRegion(regions[0].label);
  I.fillField('input[name=date-date]', formatDateValue(regions[0].dateValue, format));
  I.updateAnnotation();
  // next region with empty required date is selected and error is shown
  I.see('DateTime "date" is required');
  I.click('OK');
  AtSidebar.seeSelectedRegion(regions[1].label);

  I.say('Fill all per-region date fields and check it\'s all good');
  regions.forEach(region => {
    I.click(locate('li').withText(region.text));
    I.fillField('input[name=date-date]', formatDateValue(region.dateValue, format));
  });

  I.click(locate('li').withText(regions[0].text));
  // less than min
  I.selectOption('select[name=year-year]', '1999');
  assert.strictEqual('', await I.grabValueFrom('select[name=year-year]'));
  // more than max
  I.selectOption('select[name=year-year]', '2023');
  assert.strictEqual('', await I.grabValueFrom('select[name=year-year]'));
  // exactly the same as max, should be correct
  I.selectOption('select[name=year-year]', '2022');
  assert.strictEqual('2022', await I.grabValueFrom('select[name=year-year]'));
  I.pressKey('Escape');

  regions.forEach(region => {
    I.click(locate('li').withText(region.text));
    I.selectOption('select[name=year-year]', region.year);
  });

  I.updateAnnotation();
  I.dontSee('Warning');
  I.dontSee('is required');

  regions.forEach(region => {
    I.click(locate('li').withText(region.text));
    // important to see that per-regions change their values
    I.seeInField('input[name=date-date]', region.dateValue);
    I.seeInField('select[name=year-year]', region.year);
  });

  const results = await I.executeScript(serialize);

  results.filter(result => result.value.start).forEach(result => {
    const input = regions.find(reg => reg.text === result.value.text);
    const expected = { end: input.rangeEnd, start: input.rangeStart, text: input.text };

    switch (result.from_name) {
      case 'label': expected.labels = [input.label]; break;
      case 'date': expected.datetime = input.dateValue; break;
      // year is formatted in config to be an ISO date
      case 'year': expected.datetime = input.year + '-01-01'; break;
    }

    assert.deepStrictEqual(result.value, expected);
  });

  assert.strictEqual(results[0].value.datetime, createdDate.result);
});
