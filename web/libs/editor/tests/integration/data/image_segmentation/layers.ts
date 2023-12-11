export const simpleConfig = `
  <View>
    <Image name="img" value="$image"></Image>
    <RectangleLabels name="tag" toName="img">
      <Label value="Label 1" background="green"></Label>
      <Label value="Label 2" background="blue"></Label>
    </RectangleLabels>
  </View>
`;

export const simpleImageData = {
  image: 'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg',
};

export const simpleResult = [
  {
    id: 'Dx_aB91ISN',
    source: '$image',
    from_name: 'tag',
    to_name: 'img',
    type: 'rectanglelabels',
    origin: 'manual',
    value: {
      height: 20,
      rotation: 0,
      width: 20,
      x: 40,
      y: 40,
      rectanglelabels: ['Label 1'],
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
      height: 90,
      rotation: 0,
      width: 90,
      x: 5,
      y: 5,
      rectanglelabels: ['Label 2'],
    },
  },
];