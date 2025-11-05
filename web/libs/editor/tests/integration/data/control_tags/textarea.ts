export const simpleData = {
  text: "This text exists for no reason",
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
    id: "reg1",
    type: "labels",
    from_name: "lbl",
    to_name: "text",
    value: {
      start: 5,
      end: 9,
      labels: ["Word"],
      text: "text",
    },
  },
];

export const textareaConfigWithValue = `<View>
  <Text name="text"/>
  <TextArea name="desc" toName="text" value="Pre-filled text" />
</View>`;

export const textareaConfigWithValueAndRows = `<View>
  <Text name="text"/>
  <TextArea name="desc" toName="text" value="Pre-filled text" rows="3" />
</View>`;

export const textareaConfigWithMaxSubmissions = `<View>
  <Text name="text"/>
  <TextArea name="desc" toName="text" maxSubmissions="2" />
</View>`;

export const textareaConfigWithValueAndMaxSubmissions = `<View>
  <Text name="text"/>
  <TextArea name="desc" toName="text" value="Pre-filled text" maxSubmissions="2" />
</View>`;
