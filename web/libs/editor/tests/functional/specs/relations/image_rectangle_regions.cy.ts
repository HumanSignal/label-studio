import { ImageView, LabelStudio, Relations, Sidebar } from '@heartexlabs/ls-test/helpers/LSF';

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

const image =
  'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg';

const task = {
  id: 1,
  annotations: [
    {
      id: 1001,
      result: [
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
            y: 5.866,
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
            x: 50.8,
            y: 25.866,
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
            x: 50.8,
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
            x: 50.8,
            y: 65.866,
            rectanglelabels: ['Planet'],
          },
        },
      ],
    },
  ],
  predictions: [],
  data: { image },
};

describe('Relations: Image Rectangle Regions', () => {
  it('Check hotkeys work with the relations action button visible', () => {
    LabelStudio.init({
      config,
      task,
    });

    Relations.hasRelations(0);

    // Select the first region
    Sidebar.toggleRegionSelection(0);

    // Check that the hotkeys work
    Relations.toggleCreationWithHotkey();

    // Select the second region
    ImageView.clickAtRelative(0.51, 0.26);

    // Check that the region is created in the relations panel
    Relations.hasRelations(1);
    Relations.hasRelation('Moonwalker', 'Moonwalker 2');

    // Reslect the first region and create a relation with the third region
    ImageView.clickAtRelative(0.51, 0.06);

    Relations.toggleCreation();

    // Select the third region
    ImageView.clickAtRelative(0.51, 0.46);

    // Check that the region is created in the relations panel
    Relations.hasRelations(2);
    Relations.hasRelation('Moonwalker', 'Moonwalker 3');

    // Create a relation between the last region and the first
    ImageView.clickAtRelative(0.51, 0.66);

    Relations.toggleCreation();

    ImageView.clickAtRelative(0.51, 0.06);

    // Check that the region is created in the relations panel
    Relations.hasRelations(3);
    Relations.hasRelation('Planet', 'Moonwalker');
  });

  it('Check hotkeys work without the relations action button visible', () => {
    LabelStudio.init({
      config,
      task,
    });

    Relations.hasRelations(0);

    // With the relations action button not visible
    Sidebar.collapseDetailsRightPanel();

    // Select the first region
    Sidebar.toggleRegionSelection(0);

    // Check that the hotkeys work
    Relations.toggleCreationWithHotkey();

    // Select the second region
    ImageView.clickAtRelative(0.51, 0.26);

    // Check that the region is created in the relations panel
    Sidebar.expandDetailsRightPanel();
    Relations.hasRelations(1);
    Relations.hasRelation('Moonwalker', 'Moonwalker 2');

    // Reslect the first region and create a relation with the third region
    ImageView.clickAtRelative(0.51, 0.06);

    Relations.toggleCreation();

    // Select the third region
    ImageView.clickAtRelative(0.51, 0.46);

    // Check that the region is created in the relations panel
    Relations.hasRelations(2);
    Relations.hasRelation('Moonwalker', 'Moonwalker 3');

    // Create a relation between the last region and the first
    ImageView.clickAtRelative(0.51, 0.66);

    Relations.toggleCreation();

    ImageView.clickAtRelative(0.51, 0.06);

    // Check that the region is created in the relations panel
    Relations.hasRelations(3);
    Relations.hasRelation('Planet', 'Moonwalker');
  });
});
