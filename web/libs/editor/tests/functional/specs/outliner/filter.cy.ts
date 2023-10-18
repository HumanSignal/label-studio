import { ImageView, Labels, LabelStudio, Sidebar } from '@heartexlabs/ls-test/helpers/LSF';
import {FF_LSDV_E_278} from "../../../../src/utils/feature-flags";

const config = `
  <View>
    <Image name="img" value="$image"></Image>
    <RectangleLabels name="tag" toName="img">
      <Label value="Planet"></Label>
      <Label value="Moonwalker" background="blue"></Label>
      <Label value="Moonwalker 1" background="red"></Label>
      <Label value="Moonwalker 2" background="pink"></Label>
      <Label value="Moonwalker 3" background="yellow"></Label>
    </RectangleLabels>
  </View>
`;

const configWithAllowEmpty = `
  <View>
    <Image name="img" value="$image"></Image>
    <RectangleLabels name="tag" toName="img" allowEmpty="true">
      <Label value="Planet"></Label>
      <Label value="Moonwalker" background="blue"></Label>
      <Label value="Moonwalker 1" background="red"></Label>
      <Label value="Moonwalker 2" background="pink"></Label>
      <Label value="Moonwalker 3" background="yellow"></Label>
    </RectangleLabels>
  </View>
`;

const image = 'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg';

const task = {
  id: 1,
  annotations: [{ id: 1001, result: [
    {
      id: 'Dx_aB91ISN',
      source: '$image',
      from_name: 'tag',
      to_name: 'img',
      type: 'rectanglelabels',
      origin: 'manual',
      value: {
        height: 10.458911419423693,
        rotation: 0,
        width: 12.4,
        x: 50.8,
        y: 5.869797225186766,
        rectanglelabels: ['Moonwalker'],
      },
    },
    {
      id: 'Dx_aB91INs',
      source: '$image',
      from_name: 'tag',
      to_name: 'img',
      type: 'rectanglelabels',
      origin: 'manual',
      value: {
        height: 10.458911419423693,
        rotation: 0,
        width: 12.4,
        x: 150.8,
        y: 15.866,
        rectanglelabels: ['Moonwalker 2'],
      },
    },
    {
      id: 'Dx_aB91ANs',
      source: '$image',
      from_name: 'tag',
      to_name: 'img',
      type: 'rectanglelabels',
      origin: 'manual',
      value: {
        height: 10.458911419423693,
        rotation: 0,
        width: 12.4,
        x: 150.8,
        y: 45.866,
        rectanglelabels: ['Moonwalker 3'],
      },
    },
    {
      id: 'Dx_aB19ISN',
      source: '$image',
      from_name: 'tag',
      to_name: 'img',
      type: 'rectanglelabels',
      origin: 'manual',
      value: {
        height: 10.458911419423693,
        rotation: 0,
        width: 12.4,
        x: 250.8,
        y: 15.866,
        rectanglelabels: ['Planet'],
      },
    },
  ] }],
  predictions: [],
  data: { image },
};

describe('Filter outliner scenario', () => {
  const FF_LSDV_3025 = 'fflag_feat_front_lsdv_3025_outliner_filter_short';

  beforeEach(() => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      [FF_LSDV_3025]: true,
    });
  });

  it('Check if filter is visible', () => {
    LabelStudio.init({
      config,
      task,
    });

    cy.get('[data-testid="filter-button"]').should('be.visible');
  });

  it('Check if filter is filtering', () => {
    LabelStudio.init({
      config,
      task,
    });

    cy.get('[data-testid="filter-button"]').click();
    cy.contains('Add Filter').click();
    cy.get('[data-testid="operation-dropdown"]').click();
    cy.contains('contains').click();
    cy.get('[data-testid="filter-input"]').type('Planet');
    Sidebar.hasRegions(1);
  });

  it('Check if filter message is hidden', () => {
    LabelStudio.init({
      config,
      task,
    });

    cy.contains('Adjust or remove filters to view').should('not.exist');
  });

  it('Check if filter message for 1 filter item is showing', () => {
    LabelStudio.init({
      config,
      task,
    });

    cy.get('[data-testid="filter-button"]').click();
    cy.contains('Add Filter').click();
    cy.get('[data-testid="operation-dropdown"]').click();
    cy.contains('contains').click();
    cy.get('[data-testid="filter-input"]').type('Moonwalker');
    cy.contains('There is 1 hidden region').should('be.visible');
  });

  it('Check if filter message for 2 or more filter items is showing', () => {
    LabelStudio.init({
      config,
      task,
    });

    cy.get('[data-testid="filter-button"]').click();
    cy.contains('Add Filter').click();
    cy.get('[data-testid="operation-dropdown"]').click();
    cy.contains('contains').click();
    cy.get('[data-testid="filter-input"]').type('Moonwalker ');
    cy.contains('There are 2 hidden regions').should('be.visible');
  });

  it('Check if filter message for all items hidden is showing', () => {
    LabelStudio.init({
      config,
      task,
    });

    cy.get('[data-testid="filter-button"]').click();
    cy.contains('Add Filter').click();
    cy.get('[data-testid="operation-dropdown"]').click();
    cy.contains('contains').click();
    cy.get('[data-testid="filter-input"]').type('Moonwalker 4');
    cy.contains('All regions hidden').should('be.visible');
  });

  it('isEmpty should filter empty labels', () => {
    LabelStudio.init({
      config: configWithAllowEmpty,
      task,
    });

    Labels.select('blank');

    ImageView.drawRect(20, 20, 100, 100);

    cy.get('[data-testid="filter-button"]').click();
    cy.contains('Add Filter').click();
    cy.get('[data-testid="operation-dropdown"]').click();
    cy.contains('is empty').click();
    Sidebar.hasRegions(1);
  });

  it('Should filter regions if user add new regions', () => {
    LabelStudio.init({
      config,
      task,
    });

    cy.get('[data-testid="filter-button"]').click();
    cy.contains('Add Filter').click();
    cy.get('[data-testid="operation-dropdown"]').click();
    cy.contains('contains').click();
    cy.get('[data-testid="filter-input"]').type('Moonwalker 2');

    Sidebar.hasRegions(1);

    Labels.select('Moonwalker 2');
    ImageView.drawRect(20, 20, 20, 20);

    Sidebar.hasRegions(2);

    Labels.select('Planet');
    ImageView.drawRect(270, 450, 20, 20);

    Sidebar.hasRegions(2);
    cy.contains('There are 4 hidden regions').should('be.visible');

  });

  it('Shouldnt show all items if second filter is set to OR and doesnt have any value added', () => {
    LabelStudio.init({
      config,
      task,
    });

    cy.get('[data-testid="filter-button"]').click();
    cy.contains('Add Filter').click();
    cy.get('[data-testid="operation-dropdown"]').click();
    cy.contains('contains').click();
    cy.get('[data-testid="filter-input"]').type('Moonwalker ');
    cy.contains('There are 2 hidden regions').should('be.visible');
    cy.contains('Add Another Filter').click();
    cy.get('[data-testid="logic-dropdown"]').click();
    cy.get('.lsf-select__list').contains('Or').click();

    Sidebar.hasRegions(2);
  });

  it('Should remove the first filter rule if its deleted', () => {
    LabelStudio.init({
      config,
      task,
    });

    cy.get('[data-testid="filter-button"]').click();
    cy.contains('Add Filter').click();
    cy.get('[data-testid="operation-dropdown"]').click();
    cy.contains('contains').click();
    cy.get('[data-testid="filter-input"]').type('Moonwalker ');
    cy.contains('There are 2 hidden regions').should('be.visible');
    cy.contains('Add Another Filter').click();
    cy.get('[data-testid="logic-dropdown"]').click();
    cy.get('.lsf-select__list').contains('Or').click();
    cy.contains('Select value').click();
    cy.get('.lsf-select__dropdown.lsf-visible > .lsf-select__list').contains('contains').click();
    cy.get('[data-testid="filter-input"]').eq(1).type('Planet');
    Sidebar.hasRegions(3);
    cy.get('[data-testid="delete-row-0"]').click();
    Sidebar.hasRegions(1);
  });
});
