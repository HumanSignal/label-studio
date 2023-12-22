const config = `
<View>
  <Image name="img" value="$image" showMousePos="true" zoom="true"></Image>
  <PolygonLabels name="tag" toName="img" strokewidth="5" fillcolor="red" pointstyle="circle" pointsize="small">
    <Label value="Hello" background="red"></Label>
    <Label value="World" background="blue"></Label>
  </PolygonLabels>
</View>
`;

const data = {
  image: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Fronalpstock_big.jpg',
};

const result = [
  {
    id: 'XSMXwwsaTa',
    from_name: 'tag',
    to_name: 'img',
    type: 'polygonlabels',
    origin: 'manual',
    original_width: 10109,
    original_height: 4542,
    image_rotation: 0,
    value: {
      points: [
        [27.199999999999996, 41.246290801186944],
        [25.73333333333333, 70.62314540059347],
        [48.13333333333333, 62.61127596439169],
        [48.13333333333333, 32.93768545994065],
      ],
      polygonlabels: [
        'Hello',
      ],
    },
  },
  {
    id: 'DSm8iGlaA8',
    from_name: 'tag',
    to_name: 'img',
    type: 'polygonlabels',
    origin: 'manual',
    original_width: 10109,
    original_height: 4542,
    image_rotation: 0,
    value: {
      points: [
        [60.788381742738586, 76.21247113163972],
        [65.87136929460583, 52.19399538106235],
        [88.69294605809128, 60.508083140877595],
        [87.75933609958506, 87.06697459584295],
      ],
      polygonlabels: [
        'World',
      ],
    },
  },
];

const title = 'Polygons on Image';

module.exports = { config, data, result, title };
