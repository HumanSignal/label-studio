import { ChipInput } from '../../../src/components/ChipInput';
import React from 'react';

describe('Basic rendering', () => {
  it('should render the input', () => {
    cy.mount(<ChipInput />);
  });
});
