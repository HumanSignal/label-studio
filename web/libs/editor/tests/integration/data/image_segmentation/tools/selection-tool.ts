export const simpleImageData = {
  image: 'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg',
};

export const simpleRectangleConfig = `
            <View>
              <Image name="image" value="$image" />
              <Rectangle name="rect" toName="image" />
            </View>`;

export const simpleRectangleResult = [
  {
    'id': 'rect_1',
    'original_width': 2242,
    'original_height': 2802,
    'image_rotation': 0,
    'value': {
      'x': 20,
      'y': 20,
      'width': 60,
      'height': 60,
      'rotation': 0,
    },
    'from_name': 'rect',
    'to_name': 'image',
    'type': 'rectangle',
    'origin': 'manual',
  },
];

export const fourRectanglesResult = [
  {
    'id': 'rect_1',
    'original_width': 2242,
    'original_height': 2802,
    'image_rotation': 0,
    'value': {
      'x': 20,
      'y': 20,
      'width': 20,
      'height': 20,
      'rotation': 0,
    },
    'from_name': 'rect',
    'to_name': 'image',
    'type': 'rectangle',
    'origin': 'manual',
  },
  {
    'id': 'rect_2',
    'original_width': 2242,
    'original_height': 2802,
    'image_rotation': 0,
    'value': {
      'x': 60,
      'y': 20,
      'width': 20,
      'height': 20,
      'rotation': 0,
    },
    'from_name': 'rect',
    'to_name': 'image',
    'type': 'rectangle',
    'origin': 'manual',
  },
  {
    'id': 'rect_3',
    'original_width': 2242,
    'original_height': 2802,
    'image_rotation': 0,
    'value': {
      'x': 20,
      'y': 60,
      'width': 20,
      'height': 20,
      'rotation': 0,
    },
    'from_name': 'rect',
    'to_name': 'image',
    'type': 'rectangle',
    'origin': 'manual',
  },
  {
    'id': 'rect_4',
    'original_width': 2242,
    'original_height': 2802,
    'image_rotation': 0,
    'value': {
      'x': 60,
      'y': 60,
      'width': 20,
      'height': 20,
      'rotation': 0,
    },
    'from_name': 'rect',
    'to_name': 'image',
    'type': 'rectangle',
    'origin': 'manual',
  },
];

export const simpleEllipseConfig = `
            <View>
              <Image name="image" value="$image" />
              <Ellipse name="ellipse" toName="image" />
            </View>`;
export const simpleEllipseResult = [
  {
    'id': 'ellipse_1',
    'original_width': 2242,
    'original_height': 2802,
    'image_rotation': 0,
    'value': {
      'x': 50,
      'y': 50,
      'radiusX': 30,
      'radiusY': 30,
      'rotation': 0,
    },
    'from_name': 'ellipse',
    'to_name': 'image',
    'type': 'ellipse',
    'origin': 'manual',
  },
];
export const simplePolygonConfig = `
            <View>
              <Image name="image" value="$image" />
              <Polygon name="polygon" toName="image" />
            </View>`;
export const simplePolygonResult = [
  {
    'id': 'polygon_1',
    'original_width': 2242,
    'original_height': 2802,
    'image_rotation': 0,
    'value': {
      /*
        ____
       | ___|
       | |___
       |____|
       */
      'points': [
        [20, 20],
        [80, 20],
        [80, 40],
        [40, 40],
        [40, 60],
        [80, 60],
        [80, 80],
        [20, 80],
      ],
    },
    'from_name': 'polygon',
    'to_name': 'image',
    'type': 'polygon',
    'origin': 'manual',
  },
];
export const simplePointConfig = `
            <View>
              <Image name="image" value="$image" />
              <KeyPoint name="keypoint" toName="image" />
            </View>`;
export const simplePointResult = [
  {
    'id': 'keypoint_1',
    'original_width': 2242,
    'original_height': 2802,
    'image_rotation': 0,
    'value': {
      x: 50,
      y: 50,
      width: 100 / 2242,
    },
    'from_name': 'keypoint',
    'to_name': 'image',
    'type': 'keypoint',
    'origin': 'manual',
  },
];