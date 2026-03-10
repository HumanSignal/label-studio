export const polygonConfig = `<View>
  <Image name="img" value="$image"/>
  <PolygonLabels name="tag" toName="img">
    <Label value="Planet"/>
  </PolygonLabels>
</View>`;

export const imageData = {
  image:
    "https://htx-pub.s3.us-east-1.amazonaws.com/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg",
};

export const closedPolygonResult = [
  {
    id: "closed_poly",
    type: "polygonlabels",
    value: {
      points: [
        [10, 10],
        [30, 10],
        [30, 30],
        [10, 30],
      ],
      closed: true,
      polygonlabels: ["Planet"],
    },
    origin: "manual",
    to_name: "img",
    from_name: "tag",
    original_width: 2560,
    original_height: 1706,
    image_rotation: 0,
  },
];

export const unfinishedPolygonResult = [
  {
    id: "unfinished_poly",
    type: "polygonlabels",
    value: {
      points: [
        [10, 10],
        [30, 10],
        [30, 30],
        [10, 30],
      ],
      closed: false,
      polygonlabels: ["Planet"],
    },
    origin: "manual",
    to_name: "img",
    from_name: "tag",
    original_width: 2560,
    original_height: 1706,
    image_rotation: 0,
  },
];
