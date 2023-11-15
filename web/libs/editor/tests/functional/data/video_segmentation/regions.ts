export const simpleVideoData = { video: '/files/opossum_intro.webm' };

export const simpleVideoConfig = `<View>
  <Video name="video" value="$video" />
  <VideoRectangle name="box" toName="video" />
  <Labels name="tag" toName="video">
    <Label value="Label 1" background="green" hotkey="1"/>
    <Label value="Label 2" background="blue" hotkey="2"/>
  </Labels>
</View>`;

export const simpleVideoResult = [
  {
    'value': {
      'framesCount': 131,
      'duration': 5.425,
      'sequence': [
        {
          'frame': 1,
          'enabled': true,
          'rotation': 0,
          'x': 20.54721030042918,
          'y': 15.665236051502147,
          'width': 58.90557939914163,
          'height': 68.6695278969957,
          'time': 0.041666666666666664,
        },
        {
          'x': 20.54721030042918,
          'y': 15.665236051502147,
          'width': 58.90557939914163,
          'height': 68.6695278969957,
          'rotation': 0,
          'enabled': false,
          'frame': 3,
          'time': 0.125,
        },
      ],
      'labels': [
        'Label 1',
      ],
    },
    'id': 'RRxnu061g3',
    'from_name': 'box',
    'to_name': 'video',
    'type': 'videorectangle',
    'origin': 'manual',
  },
];