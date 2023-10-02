import { Choices, DateTime, LabelStudio, Modals, Number, Rating, Sidebar, Taxonomy, Textarea, ToolBar } from '@heartexlabs/ls-test/helpers/LSF';
import {
  CHOICES_REQUIRED_WARNING,
  DATETIME_REQUIRED_WARNING, NUMBER_REQUIRED_WARNING,
  perItemChoicesResult, perItemDateTimeResult,
  perItemMIGChoicesConfig, perItemMIGDateTimeConfig, perItemMIGNumberConfig, perItemMIGRatingConfig,
  perItemMIGTaxonomyConfig, perItemMIGTextareaConfig, perItemNumberResult,
  perItemRatingResult,
  perItemTaxonomyResult, perItemTextareaResult,
  perRegionChoicesResult, perRegionDateTimeResult,
  perRegionMIGChoicesConfig, perRegionMIGDateTimeConfig, perRegionMIGNumberConfig,
  perRegionMIGRatingConfig, perRegionMIGTaxonomyConfig, perRegionMIGTextareaConfig, perRegionNumberResult,
  perRegionRatingResult,
  perRegionRegionsResult,
  perRegionTaxonomyResult,
  perRegionTextareaResult,
  perTagChoicesResult,
  perTagDateTimeResult,
  perTagMIGChoicesConfig,
  perTagMIGDateTimeConfig, perTagMIGNumberConfig, perTagMIGRatingConfig, perTagMIGTaxonomyConfig,
  perTagMIGTextareaConfig, perTagNumberResult,
  perTagRatingResult,
  perTagTaxonomyResult,
  perTagTextareaResult,
  RATING_REQUIRED_WARNING,
  requiredPerItemMIGChoicesConfig, requiredPerItemMIGDateTimeConfig, requiredPerItemMIGNumberConfig,
  requiredPerItemMIGRatingConfig,
  requiredPerItemMIGTaxonomyConfig,
  requiredPerItemMIGTextareaConfig,
  requiredPerRegionMIGChoicesConfig, requiredPerRegionMIGDateTimeConfig, requiredPerRegionMIGNumberConfig,
  requiredPerRegionMIGRatingConfig,
  requiredPerRegionMIGTaxonomyConfig,
  requiredPerRegionMIGTextareaConfig,
  requiredPerTagMIGChoicesConfig, requiredPerTagMIGDateTimeConfig, requiredPerTagMIGNumberConfig,
  requiredPerTagMIGRatingConfig,
  requiredPerTagMIGTaxonomyConfig,
  requiredPerTagMIGTextareaConfig,
  simpleImageChoicesConfig,
  simpleImageData,
  simpleImageDateTimeConfig, simpleImageNumberConfig,
  simpleImageRatingConfig,
  simpleImageTaxonomyConfig,
  simpleImageTextareaConfig,
  simpleMIGData,
  TAXONOMY_REQUIRED_WARNING,
  TEXTAREA_REQUIRED_WARNING
} from '../../../data/control_tags/per-item';
import { ImageView } from '@heartexlabs/ls-test/helpers/LSF/index';
import { FF_DEV_2100, FF_LSDV_4583 } from '../../../../../src/utils/feature-flags';

beforeEach(() => {
  LabelStudio.addFeatureFlagsOnPageLoad({
    [FF_LSDV_4583]: true,
    [FF_DEV_2100]: true,
  });
});

/* <DateTime /> */
describe('Classification - single image - DateTime', () => {
  it('should create result without item_index', () => {
    LabelStudio.params()
      .config(simpleImageDateTimeConfig)
      .data(simpleImageData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    DateTime.type('2000-01-01T01:01');

    LabelStudio.serialize().then(result => {
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });

  it('should load perTag result correctly', () => {
    LabelStudio.params()
      .config(simpleImageDateTimeConfig)
      .data(simpleImageData)
      .withResult(perTagDateTimeResult)
      .init();

    ImageView.waitForImage();

    DateTime.hasValue('2000-01-01T01:01');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.deep.include(perTagDateTimeResult[0]);
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });
});
describe('Classification - MIG perTag - DateTime', () => {
  it('should not have item_index in result', () => {
    LabelStudio.params()
      .config(perTagMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    DateTime.type('2000-01-01T01:01');

    LabelStudio.serialize().then(result => {
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });

  it('should load perTag result correctly', () => {
    LabelStudio.params()
      .config(perTagMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult(perTagDateTimeResult)
      .init();

    ImageView.waitForImage();

    DateTime.hasValue('2000-01-01T01:01');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.deep.include(perTagDateTimeResult[0]);
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });

  it('should keep value between items', () => {
    LabelStudio.params()
      .config(perTagMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    DateTime.type('2000-01-01T01:01');
    DateTime.hasValue('2000-01-01T01:01');

    ImageView.paginationNextBtn.click();

    DateTime.hasValue('2000-01-01T01:01');
  });

  it('should require result', () =>{
    LabelStudio.params()
      .config(requiredPerTagMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(DATETIME_REQUIRED_WARNING);
  });

  it('should not require result if there is one', () =>{
    LabelStudio.params()
      .config(requiredPerTagMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    DateTime.type('2000-01-01T01:01');

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
describe('Control Tags - MIG perRegion - DateTime', () => {
  it('should create result with item_index', ()=> {
    LabelStudio.params()
      .config(perRegionMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    DateTime.type('2000-01-01T01:01');

    LabelStudio.serialize().then(result => {
      expect(result.length).to.be.eq(3);
      expect(result[1]).to.include({
        type: 'datetime',
        item_index: 0,
      });
    });
  });

  it('should load result correctly', () => {
    LabelStudio.params()
      .config(perRegionMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult(perRegionDateTimeResult)
      .init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    DateTime.hasValue('2000-01-01T01:01');

    LabelStudio.serialize().then(result => {
      const { value, ...expectedResult } = perRegionDateTimeResult[1];

      expect(result.length).to.be.eq(3);
      expect(result[1]).to.deep.include(expectedResult);
      expect(result[1].value.datetime).to.be.deep.eq( value.datetime );
    });
  });

  it('should require result', () =>{
    LabelStudio.params()
      .config(requiredPerRegionMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(DATETIME_REQUIRED_WARNING);
  });

  it('should require result for other region too', () =>{
    LabelStudio.params()
      .config(requiredPerRegionMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    DateTime.type('2000-01-01T01:01');

    ToolBar.submitBtn.click();
    Modals.hasWarning(DATETIME_REQUIRED_WARNING);
  });

  it('should not require result if there are all of them', () =>{
    LabelStudio.params()
      .config(requiredPerRegionMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    DateTime.type('2000-01-01T01:01');

    Sidebar.findRegionByIndex(1).click();
    ImageView.waitForImage();
    DateTime.type('2000-02-02T02:02');

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
describe('Control Tags - MIG perItem - DateTime', () => {
  it('should create result with item_index', () => {
    LabelStudio.params()
      .config(perItemMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    DateTime.type('2000-01-01T01:01');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.have.property('item_index', 0);
    });
  });

  it('should load perItem result correctly', () => {
    LabelStudio.params()
      .config(perItemMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult(perItemDateTimeResult)
      .init();

    ImageView.waitForImage();

    DateTime.hasValue('2000-01-01T01:01');
    ImageView.paginationNextBtn.click();
    DateTime.hasValue('2000-02-02T02:02');
    ImageView.paginationNextBtn.click();
    DateTime.hasValue('2000-03-03T03:03');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.deep.include(perItemDateTimeResult[0]);
      expect(result[1]).to.deep.include(perItemDateTimeResult[1]);
      expect(result[2]).to.deep.include(perItemDateTimeResult[2]);
    });
  });

  it('should be able to create result for second item', () => {
    LabelStudio.params()
      .config(perItemMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    DateTime.type('2000-01-01T01:01');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.have.property('item_index', 1);
    });
  });

  it('should be able to create more that one result', () => {
    LabelStudio.params()
      .config(perItemMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    DateTime.type('2000-01-01T01:01');

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    DateTime.type('2000-02-02T02:02');

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    DateTime.type('2000-03-03T03:03');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.include({ item_index: 0 });
      expect(result[0]).to.nested.include({ 'value.datetime': '2000-01-01T01:01' });

      expect(result[1]).to.include({ item_index: 1 });
      expect(result[1]).to.nested.include({ 'value.datetime': '2000-02-02T02:02' });

      expect(result[2]).to.include({ item_index: 2 });
      expect(result[2]).to.nested.include({ 'value.datetime': '2000-03-03T03:03' });
    });
  });

  it('should require result', () =>{
    LabelStudio.params()
      .config(requiredPerItemMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(DATETIME_REQUIRED_WARNING);
  });

  it('should require result for other region too', () =>{
    LabelStudio.params()
      .config(requiredPerItemMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    DateTime.type('2000-01-01T01:01');

    ToolBar.submitBtn.click();
    Modals.hasWarning(DATETIME_REQUIRED_WARNING);
  });

  it('should not require result if there are all of them', () =>{
    LabelStudio.params()
      .config(requiredPerItemMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    DateTime.type('2000-01-01T01:01');
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    DateTime.type('2000-02-02T02:02');
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    DateTime.type('2000-03-03T03:03');
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    DateTime.type('2000-04-04T04:04');

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});

/* <Choices /> */
describe('Classification - single image - Choices', () => {
  it('should create result without item_index', () => {
    LabelStudio.params()
      .config(simpleImageChoicesConfig)
      .data(simpleImageData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Choices.findChoice('Choice 2').click();

    LabelStudio.serialize().then(result => {
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });

  it('should load perTag result correctly', () => {
    LabelStudio.params()
      .config(simpleImageChoicesConfig)
      .data(simpleImageData)
      .withResult(perTagChoicesResult)
      .init();

    ImageView.waitForImage();

    Choices.hasCheckedChoice('Choice 1');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.deep.include(perTagChoicesResult[0]);
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });
});
describe('Classification - MIG perTag - Choices', () => {
  it('should not have item_index in result', () => {
    LabelStudio.params()
      .config(perTagMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Choices.findChoice('Choice 2').click();

    LabelStudio.serialize().then(result => {
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });

  it('should load perTag result correctly', () => {
    LabelStudio.params()
      .config(perTagMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult(perTagChoicesResult)
      .init();

    ImageView.waitForImage();

    Choices.hasCheckedChoice('Choice 1');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.deep.include(perTagChoicesResult[0]);
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });

  it('should keep value between items', () => {
    LabelStudio.params()
      .config(perTagMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Choices.findChoice('Choice 2').click();
    Choices.hasCheckedChoice('Choice 2');

    ImageView.paginationNextBtn.click();

    Choices.hasCheckedChoice('Choice 2');
  });

  it('should require result', () =>{
    LabelStudio.params()
      .config(requiredPerTagMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(CHOICES_REQUIRED_WARNING);
  });

  it('should not require result if there is one', () =>{
    LabelStudio.params()
      .config(requiredPerTagMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Choices.findChoice('Choice 2').click();

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
describe('Control Tags - MIG perRegion - Choices', () => {
  it('should create result with item_index', ()=> {
    LabelStudio.params()
      .config(perRegionMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    Choices.findChoice('Choice 2').click();

    LabelStudio.serialize().then(result => {
      expect(result.length).to.be.eq(3);
      expect(result[1]).to.include({
        type: 'choices',
        item_index: 0,
      });
    });
  });

  it('should load result correctly', ()=> {
    LabelStudio.params()
      .config(perRegionMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult(perRegionChoicesResult)
      .init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    Choices.hasCheckedChoice('Choice 2');

    LabelStudio.serialize().then(result => {
      const { value, ...expectedResult } = perRegionChoicesResult[1];

      expect(result.length).to.be.eq(3);
      expect(result[1]).to.deep.include(expectedResult);
      expect(result[1].value.choices).to.be.deep.eq( value.choices );
    });
  });

  it('should require result', () =>{
    LabelStudio.params()
      .config(requiredPerRegionMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(CHOICES_REQUIRED_WARNING);
  });

  it('should require result for other region too', () =>{
    LabelStudio.params()
      .config(requiredPerRegionMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    Choices.findChoice('Choice 2').click();

    ToolBar.submitBtn.click();
    Modals.hasWarning(CHOICES_REQUIRED_WARNING);
  });

  it('should not require result if there are all of them', () =>{
    LabelStudio.params()
      .config(requiredPerRegionMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    Choices.findChoice('Choice 2').click();

    Sidebar.findRegionByIndex(1).click();
    ImageView.waitForImage();
    Choices.findChoice('Choice 3').click();

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
describe('Control Tags - MIG perItem - Choices', () => {
  it('should create result with item_index', () => {
    LabelStudio.params()
      .config(perItemMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Choices.findChoice('Choice 2').click();

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.have.property('item_index', 0);
    });
  });

  it('should load perItem result correctly', () => {
    LabelStudio.params()
      .config(perItemMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult(perItemChoicesResult)
      .init();

    ImageView.waitForImage();

    Choices.hasCheckedChoice('Choice 1');
    ImageView.paginationNextBtn.click();
    Choices.hasCheckedChoice('Choice 2');
    ImageView.paginationNextBtn.click();
    Choices.hasCheckedChoice('Choice 3');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.deep.include(perItemChoicesResult[0]);
      expect(result[1]).to.deep.include(perItemChoicesResult[1]);
      expect(result[2]).to.deep.include(perItemChoicesResult[2]);
    });
  });

  it('should be able to create result for second item', () => {
    LabelStudio.params()
      .config(perItemMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Choices.findChoice('Choice 2').click();

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.have.property('item_index', 1);
    });
  });

  it('should be able to create more that one result', () => {
    LabelStudio.params()
      .config(perItemMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Choices.findChoice('Choice 1').click();

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Choices.findChoice('Choice 2').click();

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Choices.findChoice('Choice 3').click();

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.include({ item_index: 0 });
      expect(result[0]).to.nested.include({ 'value.choices[0]': 'Choice 1' });

      expect(result[1]).to.include({ item_index: 1 });
      expect(result[1]).to.nested.include({ 'value.choices[0]': 'Choice 2' });

      expect(result[2]).to.include({ item_index: 2 });
      expect(result[2]).to.nested.include({ 'value.choices[0]': 'Choice 3' });
    });
  });

  it('should require result', () =>{
    LabelStudio.params()
      .config(requiredPerItemMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(CHOICES_REQUIRED_WARNING);
  });

  it('should require result for other region too', () =>{
    LabelStudio.params()
      .config(requiredPerItemMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Choices.findChoice('Choice 2').click();

    ToolBar.submitBtn.click();
    Modals.hasWarning(CHOICES_REQUIRED_WARNING);
  });

  it('should not require result if there are all of them', () =>{
    LabelStudio.params()
      .config(requiredPerItemMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Choices.findChoice('Choice 2').click();
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Choices.findChoice('Choice 2').click();
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Choices.findChoice('Choice 2').click();
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Choices.findChoice('Choice 2').click();

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});

/* <Number /> */
describe('Classification - single image - Number', () => {
  it('should create result without item_index', () => {
    LabelStudio.params()
      .config(simpleImageNumberConfig)
      .data(simpleImageData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Number.type('123');

    LabelStudio.serialize().then(result => {
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });

  it('should load perTag result correctly', () => {
    LabelStudio.params()
      .config(simpleImageNumberConfig)
      .data(simpleImageData)
      .withResult(perTagNumberResult)
      .init();

    ImageView.waitForImage();

    Number.hasValue('123');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.deep.include(perTagNumberResult[0]);
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });
});
describe('Classification - MIG perTag - Number', () => {
  it('should not have item_index in result', () => {
    LabelStudio.params()
      .config(perTagMIGNumberConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Number.type('123');

    LabelStudio.serialize().then(result => {
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });

  it('should load perTag result correctly', () => {
    LabelStudio.params()
      .config(perTagMIGNumberConfig)
      .data(simpleMIGData)
      .withResult(perTagNumberResult)
      .init();

    ImageView.waitForImage();

    Number.hasValue('123');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.deep.include(perTagNumberResult[0]);
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });

  it('should keep value between items', () => {
    LabelStudio.params()
      .config(perTagMIGNumberConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Number.type('123');
    Number.hasValue('123');

    ImageView.paginationNextBtn.click();

    Number.hasValue('123');
  });

  it('should require result', () =>{
    LabelStudio.params()
      .config(requiredPerTagMIGNumberConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(NUMBER_REQUIRED_WARNING);
  });

  it('should not require result if there is one', () =>{
    LabelStudio.params()
      .config(requiredPerTagMIGNumberConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Number.type('123');

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
describe('Control Tags - MIG perRegion - Number', () => {
  it('should create result with item_index', ()=> {
    LabelStudio.params()
      .config(perRegionMIGNumberConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    Number.type('123');

    LabelStudio.serialize().then(result => {
      expect(result.length).to.be.eq(3);
      expect(result[1]).to.include({
        type: 'number',
        item_index: 0,
      });
    });
  });

  it('should load result correctly', () => {
    LabelStudio.params()
      .config(perRegionMIGNumberConfig)
      .data(simpleMIGData)
      .withResult(perRegionNumberResult)
      .init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    Number.hasValue('123');

    LabelStudio.serialize().then(result => {
      const { value, ...expectedResult } = perRegionNumberResult[1];

      expect(result.length).to.be.eq(3);
      expect(result[1]).to.deep.include(expectedResult);
      expect(result[1].value.number).to.be.deep.eq( value.number );
    });
  });

  it('should require result', () =>{
    LabelStudio.params()
      .config(requiredPerRegionMIGNumberConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(NUMBER_REQUIRED_WARNING);
  });

  it('should require result for other region too', () =>{
    LabelStudio.params()
      .config(requiredPerRegionMIGNumberConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    Number.type('123');

    ToolBar.submitBtn.click();
    Modals.hasWarning(NUMBER_REQUIRED_WARNING);
  });

  it('should not require result if there are all of them', () =>{
    LabelStudio.params()
      .config(requiredPerRegionMIGNumberConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    Number.type('123');

    Sidebar.findRegionByIndex(1).click();
    ImageView.waitForImage();
    Number.type('456');

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
describe('Control Tags - MIG perItem - Number', () => {
  it('should create result with item_index', () => {
    LabelStudio.params()
      .config(perItemMIGNumberConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Number.type('123');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.have.property('item_index', 0);
    });
  });

  it('should load perItem result correctly', () => {
    LabelStudio.params()
      .config(perItemMIGNumberConfig)
      .data(simpleMIGData)
      .withResult(perItemNumberResult)
      .init();

    ImageView.waitForImage();

    Number.hasValue('123');
    ImageView.paginationNextBtn.click();
    Number.hasValue('456');
    ImageView.paginationNextBtn.click();
    Number.hasValue('789');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.deep.include(perItemNumberResult[0]);
      expect(result[1]).to.deep.include(perItemNumberResult[1]);
      expect(result[2]).to.deep.include(perItemNumberResult[2]);
    });
  });

  it('should be able to create result for second item', () => {
    LabelStudio.params()
      .config(perItemMIGNumberConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Number.type('456');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.have.property('item_index', 1);
    });
  });

  it('should be able to create more that one result', () => {
    LabelStudio.params()
      .config(perItemMIGNumberConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Number.type('123');

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Number.type('456');

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Number.type('789');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.include({ item_index: 0 });
      expect(result[0]).to.nested.include({ 'value.number': 123 });

      expect(result[1]).to.include({ item_index: 1 });
      expect(result[1]).to.nested.include({ 'value.number': 456 });

      expect(result[2]).to.include({ item_index: 2 });
      expect(result[2]).to.nested.include({ 'value.number': 789 });
    });
  });

  it('should require result', () =>{
    LabelStudio.params()
      .config(requiredPerItemMIGNumberConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(NUMBER_REQUIRED_WARNING);
  });

  it('should require result for other region too', () =>{
    LabelStudio.params()
      .config(requiredPerItemMIGNumberConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Number.type('123');

    ToolBar.submitBtn.click();
    Modals.hasWarning(NUMBER_REQUIRED_WARNING);
  });

  it('should not require result if there are all of them', () =>{
    LabelStudio.params()
      .config(requiredPerItemMIGNumberConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Number.type('123');
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Number.type('456');
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Number.type('789');
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Number.type('0');

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});

/* <Rating /> */
describe('Classification - single image - Rating', () => {
  it('should create result without item_index', () => {
    LabelStudio.params()
      .config(simpleImageRatingConfig)
      .data(simpleImageData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Rating.setValue(4);

    LabelStudio.serialize().then(result => {
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });

  it('should load perTag result correctly', () => {
    LabelStudio.params()
      .config(simpleImageRatingConfig)
      .data(simpleImageData)
      .withResult(perTagRatingResult)
      .init();

    ImageView.waitForImage();

    Rating.hasValue(4);

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.deep.include(perTagRatingResult[0]);
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });
});
describe('Classification - MIG perTag - Rating', () => {
  it('should not have item_index in result', () => {
    LabelStudio.params()
      .config(perTagMIGRatingConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Rating.setValue(4);

    LabelStudio.serialize().then(result => {
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });

  it('should load perTag result correctly', () => {
    LabelStudio.params()
      .config(perTagMIGRatingConfig)
      .data(simpleMIGData)
      .withResult(perTagRatingResult)
      .init();

    ImageView.waitForImage();

    Rating.hasValue(4);

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.deep.include(perTagRatingResult[0]);
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });

  it('should keep value between items', () => {
    LabelStudio.params()
      .config(perTagMIGRatingConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Rating.setValue(4);
    Rating.hasValue(4);

    ImageView.paginationNextBtn.click();

    Rating.hasValue(4);
  });

  it('should require result', () =>{
    LabelStudio.params()
      .config(requiredPerTagMIGRatingConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(RATING_REQUIRED_WARNING);
  });

  it('should not require result if there is one', () =>{
    LabelStudio.params()
      .config(requiredPerTagMIGRatingConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Rating.setValue(4);

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
describe('Control Tags - MIG perRegion - Rating', () => {
  it('should create result with item_index', ()=> {
    LabelStudio.params()
      .config(perRegionMIGRatingConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    Rating.setValue(4);

    LabelStudio.serialize().then(result => {
      expect(result.length).to.be.eq(3);
      expect(result[1]).to.include({
        type: 'rating',
        item_index: 0,
      });
    });
  });

  it('should load result correctly', () => {
    LabelStudio.params()
      .config(perRegionMIGRatingConfig)
      .data(simpleMIGData)
      .withResult(perRegionRatingResult)
      .init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    Rating.hasValue(4);

    LabelStudio.serialize().then(result => {
      const { value, ...expectedResult } = perRegionRatingResult[1];

      expect(result.length).to.be.eq(3);
      expect(result[1]).to.deep.include(expectedResult);
      expect(result[1].value.rating).to.be.deep.eq( value.rating );
    });
  });

  it('should require result', () =>{
    LabelStudio.params()
      .config(requiredPerRegionMIGRatingConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(RATING_REQUIRED_WARNING);
  });

  it('should require result for other region too', () =>{
    LabelStudio.params()
      .config(requiredPerRegionMIGRatingConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    Rating.setValue(4);

    ToolBar.submitBtn.click();
    Modals.hasWarning(RATING_REQUIRED_WARNING);
  });

  it('should not require result if there are all of them', () =>{
    LabelStudio.params()
      .config(requiredPerRegionMIGRatingConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    Rating.setValue(3);

    Sidebar.findRegionByIndex(1).click();
    ImageView.waitForImage();
    Rating.setValue(4);

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
describe('Control Tags - MIG perItem - Rating', () => {
  it('should create result with item_index', () => {
    LabelStudio.params()
      .config(perItemMIGRatingConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Rating.setValue(4);

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.have.property('item_index', 0);
    });
  });

  it('should load perItem result correctly', () => {
    LabelStudio.params()
      .config(perItemMIGRatingConfig)
      .data(simpleMIGData)
      .withResult(perItemRatingResult)
      .init();

    ImageView.waitForImage();

    Rating.hasValue(3);
    ImageView.paginationNextBtn.click();
    Rating.hasValue(4);
    ImageView.paginationNextBtn.click();
    Rating.hasValue(5);

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.deep.include(perItemRatingResult[0]);
      expect(result[1]).to.deep.include(perItemRatingResult[1]);
      expect(result[2]).to.deep.include(perItemRatingResult[2]);
    });
  });

  it('should be able to create result for second item', () => {
    LabelStudio.params()
      .config(perItemMIGRatingConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Rating.setValue(4);

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.have.property('item_index', 1);
    });
  });

  it('should be able to create more that one result', () => {
    LabelStudio.params()
      .config(perItemMIGRatingConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Rating.setValue(3);

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Rating.setValue(4);

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Rating.setValue(5);

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.include({ item_index: 0 });
      expect(result[0]).to.nested.include({ 'value.rating': 3 });

      expect(result[1]).to.include({ item_index: 1 });
      expect(result[1]).to.nested.include({ 'value.rating': 4 });

      expect(result[2]).to.include({ item_index: 2 });
      expect(result[2]).to.nested.include({ 'value.rating': 5 });
    });
  });

  it('should require result', () =>{
    LabelStudio.params()
      .config(requiredPerItemMIGRatingConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(RATING_REQUIRED_WARNING);
  });

  it('should require result for other region too', () =>{
    LabelStudio.params()
      .config(requiredPerItemMIGRatingConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Rating.setValue(4);

    ToolBar.submitBtn.click();
    Modals.hasWarning(RATING_REQUIRED_WARNING);
  });

  it('should not require result if there are all of them', () =>{
    LabelStudio.params()
      .config(requiredPerItemMIGRatingConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Rating.setValue(3);
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Rating.setValue(4);
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Rating.setValue(5);
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Rating.setValue(1);

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});

/* <Taxonomy /> */
describe('Classification - single image - Taxonomy', () => {
  it('should create result without item_index', () => {
    LabelStudio.params()
      .config(simpleImageTaxonomyConfig)
      .data(simpleImageData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.findItem('Choice 2').click();
    Taxonomy.close();

    LabelStudio.serialize().then(result => {
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });

  it('should load perTag result correctly', () => {
    LabelStudio.params()
      .config(simpleImageTaxonomyConfig)
      .data(simpleImageData)
      .withResult(perTagTaxonomyResult)
      .init();

    ImageView.waitForImage();

    Taxonomy.hasSelected('Choice 1');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.deep.include(perTagTaxonomyResult[0]);
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });
});
describe('Classification - MIG perTag - Taxonomy', () => {
  it('should not have item_index in result', () => {
    LabelStudio.params()
      .config(perTagMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.findItem('Choice 1').click();
    Taxonomy.close();

    LabelStudio.serialize().then(result => {
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });

  it('should load perTag result correctly', () => {
    LabelStudio.params()
      .config(perTagMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult(perTagTaxonomyResult)
      .init();

    ImageView.waitForImage();

    Taxonomy.hasSelected('Choice 1');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.deep.include(perTagTaxonomyResult[0]);
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });

  it('should keep value between items', () => {
    LabelStudio.params()
      .config(perTagMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.findItem('Choice 1').click();
    Taxonomy.close();
    Taxonomy.hasSelected('Choice 1');

    ImageView.paginationNextBtn.click();

    Taxonomy.hasSelected('Choice 1');
  });

  it('should require result', () =>{
    LabelStudio.params()
      .config(requiredPerTagMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(TAXONOMY_REQUIRED_WARNING);
  });

  it('should not require result if there is one', () =>{
    LabelStudio.params()
      .config(requiredPerTagMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.findItem('Choice 1').click();
    Taxonomy.close();

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
describe('Control Tags - MIG perRegion - Taxonomy', () => {
  it('should create result with item_index', ()=> {
    LabelStudio.params()
      .config(perRegionMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    Taxonomy.open();
    Taxonomy.findItem('Choice 1').click();
    Taxonomy.close();

    LabelStudio.serialize().then(result => {
      expect(result.length).to.be.eq(3);
      expect(result[1]).to.include({
        type: 'taxonomy',
        item_index: 0,
      });
    });
  });

  it('should load result correctly', () => {
    LabelStudio.params()
      .config(perRegionMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult(perRegionTaxonomyResult)
      .init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    Taxonomy.hasSelected('Choice 2');

    LabelStudio.serialize().then(result => {
      const { value, ...expectedResult } = perRegionTaxonomyResult[1];

      expect(result.length).to.be.eq(3);
      expect(result[1]).to.deep.include(expectedResult);
      expect(result[1].value.taxonomy).to.be.deep.eq( value.taxonomy );
    });
  });

  it('should require result', () =>{
    LabelStudio.params()
      .config(requiredPerRegionMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(TAXONOMY_REQUIRED_WARNING);
  });

  it('should require result for other region too', () =>{
    LabelStudio.params()
      .config(requiredPerRegionMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    Taxonomy.open();
    Taxonomy.findItem('Choice 1').click();

    ToolBar.submitBtn.click();
    Modals.hasWarning(TAXONOMY_REQUIRED_WARNING);
  });

  it('should not require result if there are all of them', () =>{
    LabelStudio.params()
      .config(requiredPerRegionMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    Taxonomy.open();
    Taxonomy.findItem('Choice 1').click();

    Sidebar.findRegionByIndex(1).click();
    ImageView.waitForImage();
    Taxonomy.open();
    Taxonomy.findItem('Choice 2').click();

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
describe('Control Tags - MIG perItem - Taxonomy', () => {
  it('should create result with item_index', () => {
    LabelStudio.params()
      .config(perItemMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.findItem('Choice 1').click();

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.have.property('item_index', 0);
    });
  });

  it('should load perItem result correctly', () => {
    LabelStudio.params()
      .config(perItemMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult(perItemTaxonomyResult)
      .init();

    ImageView.waitForImage();

    Taxonomy.hasSelected('Choice 1');
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Taxonomy.hasSelected('Choice 2');
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Taxonomy.hasSelected('Choice 3');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.deep.include(perItemTaxonomyResult[0]);
      expect(result[1]).to.deep.include(perItemTaxonomyResult[1]);
      expect(result[2]).to.deep.include(perItemTaxonomyResult[2]);
    });
  });

  it('should be able to create result for second item', () => {
    LabelStudio.params()
      .config(perItemMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.findItem('Choice 1').click();

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.have.property('item_index', 1);
    });
  });

  it('should be able to create more that one result', () => {
    LabelStudio.params()
      .config(perItemMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.findItem('Choice 1').click();

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Taxonomy.open();
    Taxonomy.findItem('Choice 2').click();

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Taxonomy.open();
    Taxonomy.findItem('Choice 3').click();

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.include({ item_index: 0 });
      expect(result[0].value.taxonomy).to.be.deep.eq([['Choice 1']]);

      expect(result[1]).to.include({ item_index: 1 });
      expect(result[1].value.taxonomy).to.be.deep.eq([['Choice 2']]);

      expect(result[2]).to.include({ item_index: 2 });
      expect(result[2].value.taxonomy).to.be.deep.eq([['Choice 3']]);
    });
  });

  it('should require result', () =>{
    LabelStudio.params()
      .config(requiredPerItemMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(TAXONOMY_REQUIRED_WARNING);
  });

  it('should require result for other region too', () =>{
    LabelStudio.params()
      .config(requiredPerItemMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.findItem('Choice 1').click();

    ToolBar.submitBtn.click();
    Modals.hasWarning(TAXONOMY_REQUIRED_WARNING);
  });

  it('should not require result if there are all of them', () =>{
    LabelStudio.params()
      .config(requiredPerItemMIGTaxonomyConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.findItem('Choice 1').click();
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.findItem('Choice 2').click();
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.findItem('Choice 3').click();
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Taxonomy.open();
    Taxonomy.findItem('Choice 2').click();

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});

/* <Textarea /> */
describe('Classification - single image - Textarea', () => {
  it('should create result without item_index', () => {
    LabelStudio.params()
      .config(simpleImageTextareaConfig)
      .data(simpleImageData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Textarea.type('Text 1{enter}');

    LabelStudio.serialize().then(result => {
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });

  it('should load perTag result correctly', () => {
    LabelStudio.params()
      .config(simpleImageTextareaConfig)
      .data(simpleImageData)
      .withResult(perTagTextareaResult)
      .init();

    ImageView.waitForImage();

    Textarea.hasValue('Text 1');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.deep.include(perTagTextareaResult[0]);
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });
});
describe('Classification - MIG perTag - Textarea', () => {
  it('should not have item_index in result', () => {
    LabelStudio.params()
      .config(perTagMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Textarea.type('Text 1{enter}');

    LabelStudio.serialize().then(result => {
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });

  it('should load perTag result correctly', () => {
    LabelStudio.params()
      .config(perTagMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult(perTagTextareaResult)
      .init();

    ImageView.waitForImage();

    Textarea.hasValue('Text 1');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.deep.include(perTagTextareaResult[0]);
      expect(result[0]).not.to.haveOwnProperty('item_index');
    });
  });

  it('should keep value between items', () => {
    LabelStudio.params()
      .config(perTagMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Textarea.type('Text 1{enter}');
    Textarea.hasValue('Text 1');

    ImageView.paginationNextBtn.click();

    Textarea.hasValue('Text 1');
  });

  it('should require result', () =>{
    LabelStudio.params()
      .config(requiredPerTagMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(TEXTAREA_REQUIRED_WARNING);
  });

  it('should not require result if there is one', () =>{
    LabelStudio.params()
      .config(requiredPerTagMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Textarea.type('123');

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
describe('Control Tags - MIG perRegion - Textarea', () => {
  it('should create result with item_index', ()=> {
    LabelStudio.params()
      .config(perRegionMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    Textarea.type('Text 1{enter}');

    LabelStudio.serialize().then(result => {
      expect(result.length).to.be.eq(3);
      expect(result[1]).to.include({
        type: 'textarea',
        item_index: 0,
      });
    });
  });

  it('should load result correctly', () => {
    LabelStudio.params()
      .config(perRegionMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult(perRegionTextareaResult)
      .init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    Textarea.hasValue('Text 1');

    LabelStudio.serialize().then(result => {
      const { value, ...expectedResult } = perRegionTextareaResult[1];

      expect(result.length).to.be.eq(3);
      expect(result[1]).to.deep.include(expectedResult);
      expect(result[1].value.text).to.be.deep.eq( value.text );
    });
  });

  it('should require result', () =>{
    LabelStudio.params()
      .config(requiredPerRegionMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(TEXTAREA_REQUIRED_WARNING);
  });

  it('should require result for other region too', () =>{
    LabelStudio.params()
      .config(requiredPerRegionMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    Textarea.type('Text 1{enter}');

    ToolBar.submitBtn.click();
    Modals.hasWarning(TEXTAREA_REQUIRED_WARNING);
  });

  it('should not require result if there are all of them', () =>{
    LabelStudio.params()
      .config(requiredPerRegionMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    Textarea.type('Text 1{enter}');
    Sidebar.findRegionByIndex(1).click();
    ImageView.waitForImage();
    Textarea.type('Text 2{enter}');

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
describe('Control Tags - MIG perItem - Textarea', () => {
  it('should create result with item_index', () => {
    LabelStudio.params()
      .config(perItemMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Textarea.type('Text 1{enter}');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.have.property('item_index', 0);
    });
  });

  it('should load perItem result correctly', () => {
    LabelStudio.params()
      .config(perItemMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult(perItemTextareaResult)
      .init();

    ImageView.waitForImage();

    Textarea.hasValue('Text 1');
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Textarea.hasValue('Text 2');
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Textarea.hasValue('Text 3');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.deep.include(perItemTextareaResult[0]);
      expect(result[1]).to.deep.include(perItemTextareaResult[1]);
      expect(result[2]).to.deep.include(perItemTextareaResult[2]);
    });
  });

  it('should be able to create result for second item', () => {
    LabelStudio.params()
      .config(perItemMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Textarea.type('Text 1{enter}');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.have.property('item_index', 1);
    });
  });

  it('should be able to create more that one result', () => {
    LabelStudio.params()
      .config(perItemMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    Textarea.type('Text 1{enter}');

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Textarea.type('Text 2{enter}');

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Textarea.type('Text 3{enter}');

    LabelStudio.serialize().then(result => {
      expect(result[0]).to.include({ item_index: 0 });
      expect(result[0].value.text).to.be.deep.eq(['Text 1']);

      expect(result[1]).to.include({ item_index: 1 });
      expect(result[1].value.text).to.be.deep.eq(['Text 2']);

      expect(result[2]).to.include({ item_index: 2 });
      expect(result[2].value.text).to.be.deep.eq(['Text 3']);
    });
  });

  it('should require result', () =>{
    LabelStudio.params()
      .config(requiredPerItemMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(TEXTAREA_REQUIRED_WARNING);
  });

  it('should require result for other region too', () =>{
    LabelStudio.params()
      .config(requiredPerItemMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Textarea.type('Text 1{enter}');

    ToolBar.submitBtn.click();
    Modals.hasWarning(TEXTAREA_REQUIRED_WARNING);
  });

  it('should not require result if there are all of them', () =>{
    LabelStudio.params()
      .config(requiredPerItemMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Textarea.type('Text 1{enter}');
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Textarea.type('Text 2{enter}');
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Textarea.type('Text 3{enter}');
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Textarea.type('Text 4{enter}');

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
