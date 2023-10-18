import { LabelStudio, Taxonomy, Tooltip } from '@heartexlabs/ls-test/helpers/LSF/index';
import {
  dataWithPrediction,
  simpleData,
  taxonomyConfig,
  taxonomyConfigWithMaxUsages
} from '../../data/control_tags/taxonomy';

describe('Control Tags - Taxonomy', () => {
  it('should show hint for <Choice />', () => {
    LabelStudio.params()
      .config(taxonomyConfig)
      .data(simpleData)
      .withResult([])
      .init();

    Taxonomy.open();
    Taxonomy.findItem('Choice 2').trigger('mouseenter');
    Tooltip.hasText('A hint for Choice 2');
  });

  it('should show error message if there are more choices selected than maxUsages is set', () => {
    LabelStudio.init({
      config: taxonomyConfigWithMaxUsages,
      task: dataWithPrediction,
    });

    cy.contains('button', 'Update').click();

    cy.contains('The number of options selected (2) exceed the maximum allowed (1). To proceed, first unselect excess options for: • Taxonomy (taxonomy)').should('exist');
  });

  it('should not show error message if choices selected is equal than maxUsages', () => {
    LabelStudio.params()
      .config(taxonomyConfigWithMaxUsages)
      .data(simpleData)
      .withResult([
        {
          'id': 'n2ldmNpSQI',
          'type': 'taxonomy',
          'value': {
            'taxonomy': [
              [
                'Bacteria',
              ],
            ],
          },
          'origin': 'manual',
          'to_name': 'text',
          'from_name': 'taxonomy',
        },
      ])
      .init();

    cy.contains('button', 'Update').click();

    cy.contains('The number of options selected (2) exceed the maximum allowed (1). To proceed, first unselect excess options for: • Taxonomy (taxonomy)').should('not.exist');
  });
});