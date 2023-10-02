import { ImageView, Labels, LabelStudio, Sidebar } from '@heartexlabs/ls-test/helpers/LSF';
import { FF_DEV_3873, FF_OUTLINER_OPTIM } from '../../../../src/utils/feature-flags';

describe('Outliner - Regions tree', () => {
  beforeEach(() => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      [FF_OUTLINER_OPTIM]: true,
      [FF_DEV_3873]: true,
    });
  });

  it('shouldn\'t show all of the regions at the regions list due to virtualization', () => {
    const text = 'a'.repeat(30);
    const result = text
      .split('')
      .map((val, idx)=>{
        return {
          'value': {
            'start': idx,
            'end': idx+1,
            'text': val,
            'labels': [
              'Label_1',
            ],
          },
          'id': `id_${idx}`,
          'from_name': 'labels',
          'to_name': 'text',
          'type': 'labels',
          'origin': 'manual',
        };
      });

    LabelStudio.params()
      .config('<View><Text name="text" value="$text"/><Labels name="labels" toName="text"><Label value="Label_1" /></Labels></View>')
      .data({ text })
      .withResult(result)
      .init();

    Sidebar.regions.eq(15).should('not.exist');
  });
});