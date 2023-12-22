const config = `
  <View>
    <Labels name="ner" toName="text">
      <Label value="Person"></Label>
      <Label value="Words"></Label>
    </Labels>
    <Text name="text" valueType="url" value="$url" />
  </View>
`;

const data = { url: 'https://htx-pub.s3.amazonaws.com/example.txt' };

const result = [
  {
    id: 'Hnyt9sO_RX',
    from_name: 'ner',
    to_name: 'text',
    type: 'labels',
    origin: 'manual',
    value: { start: 0, end: 17, labels: ['Person'] },
  },
  {
    id: 'tQHRBpvGo0',
    from_name: 'ner',
    to_name: 'text',
    type: 'labels',
    origin: 'manual',
    value: { start: 453, end: 474, labels: ['Words'] },
  },
];

const title = 'NER in text loaded by url';

module.exports = { config, data, result, title };
