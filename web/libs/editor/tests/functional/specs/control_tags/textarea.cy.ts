import { LabelStudio, Sidebar, Textarea } from '@heartexlabs/ls-test/helpers/LSF';
import {
  simpleData,
  textareaConfigPerRegion,
  textareaConfigSimple,
  textareaResultsPerRegion
} from '../../data/control_tags/textarea';
import { FF_LEAD_TIME } from '../../../../src/utils/feature-flags';

describe('Control Tags - TextArea - Lead Time', () => {
  beforeEach(() => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      [FF_LEAD_TIME]: true,
    });
  });

  it('should calculate lead_time for global TextArea', () => {
    LabelStudio.params()
      .config(textareaConfigSimple)
      .data(simpleData)
      .withResult([])
      .init();

    Textarea.type('This is a test{enter}');
    Textarea.hasValue('This is a test');

    LabelStudio.serialize().then(result => {
      const lead_time = result[0].meta.lead_time;

      expect(result.length).to.be.eq(1);
      expect(lead_time).to.be.gt(0);

      Textarea.type('Another test{enter}');

      LabelStudio.serialize().then(result2 => {
        expect(result2[0].meta.lead_time).to.be.gt(lead_time);
      });
    });
  });

  it('should calculate lead_time for per-region TextArea', () => {
    LabelStudio.params()
      .config(textareaConfigPerRegion)
      .data(simpleData)
      .withResult(textareaResultsPerRegion)
      .init();

    Sidebar.findRegionByIndex(0).click();

    Textarea.type('This is a test{enter}');
    Textarea.hasValue('This is a test');

    LabelStudio.serialize().then(result => {
      // first result for region itself, second for textarea
      const lead_time = result[1].meta.lead_time;

      expect(result.length).to.be.eq(2);
      expect(lead_time).to.be.gt(0);

      Textarea.type('Another test{enter}');

      LabelStudio.serialize().then(result2 => {
        expect(result2[1].meta.lead_time).to.be.gt(lead_time);
      });
    });
  });
});
