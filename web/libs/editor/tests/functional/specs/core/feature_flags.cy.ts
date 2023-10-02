import { LabelStudio } from '@heartexlabs/ls-test/helpers/LSF';

describe('Feature Flags', () => {
  it('can set feature flags on the global object', () => {
    const flagName = 'customFeatureFlag';
    const anotherFlag = 'anotherFlag';

    cy.visit('/');

    LabelStudio.setFeatureFlags({
      [flagName]: true,
    });

    LabelStudio.featureFlag(flagName).should('be.true');
    LabelStudio.featureFlag(anotherFlag).should('be.false');
  });

  it('can set feature flags before navigation', () => {
    // setting only this flag
    const flagName = 'customFeatureFlag';
    const anotherFlag = 'anotherFlag';

    LabelStudio.setFeatureFlagsOnPageLoad({
      [flagName]: true,
    });

    cy.visit('/');

    LabelStudio.featureFlag(flagName).should('be.true');
    LabelStudio.featureFlag(anotherFlag).should('be.false');
  });

  // helpers' self-testing to keep it clear
  it('can extend previously set flag list and set them all before navigation', () => {
    // setting only this flag
    const setFlagName = 'setFlag';
    const setButCanceledFlag = 'setButCanceledFlag';
    const addedFlagName = 'addedFlag';

    LabelStudio.setFeatureFlagsOnPageLoad({
      [setFlagName]: true,
      [setButCanceledFlag]: true,
    });

    LabelStudio.addFeatureFlagsOnPageLoad({
      [setButCanceledFlag]: false,
      [addedFlagName]: true,
    });

    cy.visit('/');

    LabelStudio.featureFlag(setFlagName).should('be.true');
    LabelStudio.featureFlag(setButCanceledFlag).should('be.false');
    LabelStudio.featureFlag(addedFlagName).should('be.true');
  });
});

