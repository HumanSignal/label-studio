const config = `
<View>
  <Image name="img" value="$image" zoom="true"></Image>
  <KeyPointLabels name="tag" toName="img" strokewidth="5" fillcolor="red">
    <Label value="Hello" background="yellow"></Label>
    <Label value="World" background="blue"></Label>
  </KeyPointLabels>
</View>
`;

const data = {
  image: 'https://user.fm/files/v2-901310d5cb3fa90e0616ca10590bacb3/spacexmoon-800x501.jpg',
};

const result = [
  {
    id: 'hqudA4A3U4',
    from_name: 'tag',
    to_name: 'img',
    image_rotation: 0,
    original_height: 501,
    original_width: 800,
    type: 'keypointlabels',
    origin: 'manual',
    value: {
      x: 49.60000000000001,
      y: 52.34042553191488,
      width: 0.6471078324314267,
      keypointlabels: ['Hello'],
    },
  },
  {
    id: 'Rz9oHDXIwG',
    from_name: 'tag',
    to_name: 'img',
    image_rotation: 0,
    original_height: 501,
    original_width: 800,
    type: 'keypointlabels',
    origin: 'manual',
    value: {
      x: 47.73333333333334,
      y: 52.765957446808514,
      width: 0.6666666666666666,
      keypointlabels: ['World'],
    },
  },
];

const title = 'Keypoints on Image';

module.exports = { config, data, result, title };
