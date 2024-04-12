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
  image: 'https://data.heartex.net/open-images/train_0/mini/0030019819f25b28.jpg',
};

const result = [
  {
    id: 'hqudA4A3U4',
    from_name: 'tag',
    to_name: 'img',
    image_rotation: 0,
    original_height: 576,
    original_width: 768,
    type: 'keypointlabels',
    origin: 'manual',
    value: {
      x: 49.60000000000001,
      y: 52.34042553191488,
      width: 0.6120428759942558,
      keypointlabels: ['Hello'],
    },
  },
  {
    id: 'Rz9oHDXIwG',
    from_name: 'tag',
    to_name: 'img',
    image_rotation: 0,
    original_height: 576,
    original_width: 768,
    type: 'keypointlabels',
    origin: 'manual',
    value: {
      x: 47.73333333333334,
      y: 52.765957446808514,
      width: 0.6305418719211823,
      keypointlabels: ['World'],
    },
  },
];

const title = 'Keypoints on Image';

module.exports = { config, data, result, title };
