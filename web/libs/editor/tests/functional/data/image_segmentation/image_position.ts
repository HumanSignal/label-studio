export const simpleConfigTL = `
  <View>
    <Image name="img" value="$image"/>
    <RectangleLabels name="tag" toName="img">
      <Label value="Label 1" background="purple"/>
    </RectangleLabels>
  </View>
`;
export const simpleConfigTR = `
  <View>
    <Image 
      name="img" 
      value="$image"
      horizontalalignment="right"
    />
    <RectangleLabels name="tag" toName="img">
      <Label value="Label 1" background="purple"/>
    </RectangleLabels>
  </View>
`;
export const simpleConfigTC = `
  <View>
    <Image
      name="img"
      value="$image"
      horizontalalignment="center"
    />
    <RectangleLabels name="tag" toName="img">
      <Label value="Label 1" background="purple"/>
    </RectangleLabels>
  </View>
`;

export const simpleConfigCL = `
  <View>
    <Image
      name="img"
      value="$image"
      verticalalignment="center"
      horizontalalignment="left"
    />
    <RectangleLabels name="tag" toName="img">
      <Label value="Label 1" background="purple"/>
    </RectangleLabels>
  </View>
`;

export const simpleConfigCC = `
  <View>
    <Image
      name="img"
      value="$image"
      verticalalignment="center"
      horizontalalignment="center"
    />
    <RectangleLabels name="tag" toName="img">
      <Label value="Label 1" background="purple"/>
    </RectangleLabels>
  </View>
`;

export const simpleConfigBR = `
  <View>
    <Image
      name="img"
      value="$image"
      verticalalignment="bottom"
      horizontalalignment="right"
      height="100vh"
    />
    <RectangleLabels name="tag" toName="img">
      <Label value="Label 1" background="purple"/>
    </RectangleLabels>
  </View>
`;

export const simpleConfigCCWithRotationControl = `
  <View>
    <Image
      name="img"
      value="$image"
      verticalalignment="center"
      horizontalalignment="center"
      rotateControl="true"
    />
    <RectangleLabels name="tag" toName="img">
      <Label value="Label 1" background="purple"/>
    </RectangleLabels>
  </View>
`;

export const simpleImageData = {
  image: 'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg',
};

export const simpleResult = [
  {
    id: 'TL',
    source: '$image',
    from_name: 'tag',
    to_name: 'img',
    type: 'rectanglelabels',
    origin: 'manual',
    value: {
      height: 2,
      rotation: 0,
      width: 2,
      x: 0,
      y: 0,
      rectanglelabels: ['Label 1'],
    },
  },
  {
    id: 'TC',
    source: '$image',
    from_name: 'tag',
    to_name: 'img',
    type: 'rectanglelabels',
    origin: 'manual',
    value: {
      height: 2,
      rotation: 0,
      width: 2,
      x: 49,
      y: 0,
      rectanglelabels: ['Label 1'],
    },
  },
  {
    id: 'TR',
    source: '$image',
    from_name: 'tag',
    to_name: 'img',
    type: 'rectanglelabels',
    origin: 'manual',
    value: {
      height: 2,
      rotation: 0,
      width: 2,
      x: 98,
      y: 0,
      rectanglelabels: ['Label 1'],
    },
  },
  {
    id: 'CL',
    source: '$image',
    from_name: 'tag',
    to_name: 'img',
    type: 'rectanglelabels',
    origin: 'manual',
    value: {
      height: 2,
      rotation: 0,
      width: 2,
      x: 0,
      y: 49,
      rectanglelabels: ['Label 1'],
    },
  },
  {
    id: 'CC',
    source: '$image',
    from_name: 'tag',
    to_name: 'img',
    type: 'rectanglelabels',
    origin: 'manual',
    value: {
      height: 2,
      rotation: 0,
      width: 2,
      x: 49,
      y: 49,
      rectanglelabels: ['Label 1'],
    },
  },
  {
    id: 'CR',
    source: '$image',
    from_name: 'tag',
    to_name: 'img',
    type: 'rectanglelabels',
    origin: 'manual',
    value: {
      height: 2,
      rotation: 0,
      width: 2,
      x: 98,
      y: 49,
      rectanglelabels: ['Label 1'],
    },
  },
  {
    id: 'BL',
    source: '$image',
    from_name: 'tag',
    to_name: 'img',
    type: 'rectanglelabels',
    origin: 'manual',
    value: {
      height: 2,
      rotation: 0,
      width: 2,
      x: 0,
      y: 98,
      rectanglelabels: ['Label 1'],
    },
  },
  {
    id: 'BC',
    source: '$image',
    from_name: 'tag',
    to_name: 'img',
    type: 'rectanglelabels',
    origin: 'manual',
    value: {
      height: 2,
      rotation: 0,
      width: 2,
      x: 49,
      y: 98,
      rectanglelabels: ['Label 1'],
    },
  },
  {
    id: 'BR',
    source: '$image',
    from_name: 'tag',
    to_name: 'img',
    type: 'rectanglelabels',
    origin: 'manual',
    value: {
      height: 2,
      rotation: 0,
      width: 2,
      x: 98,
      y: 98,
      rectanglelabels: ['Label 1'],
    },
  },
];