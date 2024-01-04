export const simpleData = {
  text: 'This text exists for no reason',
};

export const textareaConfigSimple = `<View>
  <Text name="text"/>
  <TextArea name="desc" toName="text" />
</View>`;

export const textareaConfigPerRegion = `<View>
  <Labels name="lbl" toName="text">
    <Label value="Word" />
  </Labels>
  <Text name="text" value="$text"/>
  <View visibleWhen="region-selected">
    <Header>Region description</Header>
    <TextArea name="local" toName="text" perRegion="true" />
  </View>
  <Header>Global description</Header>
  <TextArea name="global" toName="text" />
</View>`;

export const textareaResultsPerRegion = [
  {
    'id': 'reg1',
    'type': 'labels',
    'from_name': 'lbl',
    'to_name': 'text',
    'value': {
      'start': 5,
      'end': 9,
      'labels': ['Word'],
      'text': 'text',
    },
  },
];
