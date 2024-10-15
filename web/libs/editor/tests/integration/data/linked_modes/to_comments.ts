export const simpleTextConfig = `<View>
    <Text name="text" value="$text" />
    <Labels name="label" toName="text">
      <Label value="Label" />
    </Labels>
  </View>`;

export const simpleTextData = {
  text: "Hello world!",
};

export const simpleTextResult = [
  {
    id: "1",
    from_name: "label",
    to_name: "text",
    type: "labels",
    value: {
      start: 6,
      end: 11,
      text: "world",
      labels: ["Label"],
    },
  },
  {
    id: "2",
    from_name: "label",
    to_name: "text",
    type: "labels",
    value: {
      start: 0,
      end: 5,
      text: "Hello",
      labels: ["Label"],
    },
  },
];
