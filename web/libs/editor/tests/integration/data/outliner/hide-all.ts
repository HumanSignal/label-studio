export const simpleRegionsConfig = `<View>
  <Text name="text" />
  <Labels name="label" toName="text">
      <Label value="Label 1"/>
      <Label value="Label 2"/>
      <Label value="Label 2"/> 
  </Labels>
</View>`;

export const simpleRegionsData = 'Some simple text';
export const simpleRegionsResult = [
  {
    'id': 'label_1',
    'value': {
      'start': 0,
      'end': 4,
      'labels': [
        'Label 1',
      ],
    },
    'from_name': 'label',
    'to_name': 'text',
    'type': 'labels',
    'origin': 'manual',
  },
  {
    'id': 'label_2',
    'value': {
      'start': 5,
      'end': 11,
      'labels': [
        'Label 2',
      ],
    },
    'from_name': 'label',
    'to_name': 'text',
    'type': 'labels',
    'origin': 'manual',
  },
  {
    'id': 'label_3',
    'value': {
      'start': 12,
      'end': 16,
      'labels': [
        'Label 3',
      ],
    },
    'from_name': 'label',
    'to_name': 'text',
    'type': 'labels',
    'origin': 'manual',
  },
];