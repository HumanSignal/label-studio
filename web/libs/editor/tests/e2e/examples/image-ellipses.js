const config = `
<View>
  <Image name="img" value="$image"></Image>
  <EllipseLabels name="tag" toName="img" fillOpacity="0.5" strokeWidth="3">
    <Label value="Hello" background="yellow"></Label>
    <Label value="World" background="red"></Label>
  </EllipseLabels>
  <Choices name="choice" toName="img">
    <Choice value="Space" />
    <Choice value="Underground" />
  </Choices>
</View>
`;

const data = {
  image:
    'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg',
};

const result = [
  {
    from_name: 'tag',
    id: 'CPnIaS1e7v',
    image_rotation: 0,
    original_height: 2802,
    original_width: 2242,
    to_name: 'img',
    type: 'ellipselabels',
    origin: 'manual',
    value: {
      x: 50.4,
      y: 50.76307363927427,
      ellipselabels: ['Hello'],
      rotation: 0,
      radiusY: 10.672358591248665,
      radiusX: 13.333333333333334,
    },
  },
  {
    from_name: 'tag',
    id: 'CPnIaS1e8v',
    image_rotation: 0,
    original_height: 2802,
    original_width: 2242,
    to_name: 'img',
    type: 'ellipselabels',
    origin: 'manual',
    value: {
      x: 80,
      y: 80,
      ellipselabels: ['World'],
      rotation: 0,
      radiusY: 5,
      radiusX: 7,
    },
  },
  {
    from_name: 'choice',
    id: 'CkRNBWbSiK',
    to_name: 'img',
    type: 'choices',
    origin: 'manual',
    value: {
      choices: ['Space'],
    },
  },
];

const title = 'Ellipses on Image';

module.exports = { config, data, result, title };
