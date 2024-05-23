const config = `
<View>
  <Labels name="ner" toName="my_text" choice="multiple">
    <Label value="Person" background="red"/>
    <Label value="Organization" background="darkorange"/>
    <Label value="Fact" background="orange"/>
    <Label value="Money" background="green"/>
    <Label value="Date" background="darkblue"/>
    <Label value="Time" background="blue"/>
    <Label value="Ordinal" background="purple"/>
    <Label value="Percent" background="#842"/>
    <Label value="Product" background="#428"/>
    <Label value="Language" background="#482"/>
    <Label value="Location" background="rgba(0,0,0,0.8)"/>
  </Labels>
  <Text name="my_text" value="$reviewText"/>
  <Choices name="sentiment" toName="my_text" choice="single" showInLine="true">
    <Choice value="Positive"/>
    <Choice value="Negative"/>
    <Choice value="Neutral"/>
  </Choices>
  <Textarea name="description" toName="my_text" perRegion="true"
            choice="single" showInLine="true" whenLabelValue="Person">
    </Textarea>
  <Choices name="gender" toName="my_text" perRegion="true"
            choice="single" showInLine="true" whenLabelValue="Person">
      <Choice value="Female"/>
      <Choice value="Male"/>
    </Choices>
  <Choices name="currency" toName="my_text" perRegion="true"
            choice="single" showInLine="true" whenLabelValue="Money">
      <Choice value="USD"/>
      <Choice value="EUR"/>
    </Choices>
  <Choices name="sentiment2" toName="my_text"
           choice="single" showInLine="true" perRegion="true">
    <Choice value="Positive"/>
    <Choice value="Negative"/>
  </Choices>
</View>
`;

const data = {
  reviewText:
    "Not much to write about here, but it does exactly what it's supposed to. filters out the pop sounds. now my recordings are much more crisp. it is one of the lowest prices pop filters on amazon so might as well buy it, they honestly work the same despite their pricing,",
};

const result = [
  {
    value: { start: 186, end: 192, text: "amazon", labels: ["Person"] },
    id: "dLeaKthoHb",
    from_name: "ner",
    to_name: "my_text",
    type: "labels",
    origin: "manual",
  },
  {
    value: { start: 186, end: 192, text: ["huge corp"] },
    id: "dLeaKthoHb",
    from_name: "description",
    to_name: "my_text",
    type: "textarea",
    origin: "manual",
  },
  {
    value: { start: 186, end: 192, text: "amazon", choices: ["Male"] },
    id: "dLeaKthoHb",
    from_name: "gender",
    to_name: "my_text",
    type: "choices",
    origin: "manual",
  },
  {
    value: { start: 186, end: 192, text: "amazon", choices: ["Negative"] },
    id: "dLeaKthoHb",
    from_name: "sentiment2",
    to_name: "my_text",
    type: "choices",
    origin: "manual",
  },
  {
    value: { choices: ["Neutral"] },
    id: "i4d7FDNQMF",
    from_name: "sentiment",
    to_name: "my_text",
    type: "choices",
    origin: "manual",
  },
  {
    value: { start: 0, end: 3, text: "Not", labels: ["Time"] },
    id: "SnZmh8A4m2",
    from_name: "ner",
    to_name: "my_text",
    type: "labels",
    origin: "manual",
  },
  {
    value: { start: 0, end: 3, text: "Not", choices: ["Positive"] },
    id: "SnZmh8A4m2",
    from_name: "sentiment2",
    to_name: "my_text",
    type: "choices",
    origin: "manual",
  },
];

// @todo add really nested choices to config
const title = "Classifications, global and per-region";

module.exports = { config, data, result, title };
