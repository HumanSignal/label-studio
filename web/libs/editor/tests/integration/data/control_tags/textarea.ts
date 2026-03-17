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

export const textareaConfigWithRowsAndMaxSubmissions = `<View>
  <Text name="text"/>
  <TextArea name="desc" toName="text" rows="3" maxSubmissions="2" />
</View>`;

export const textareaConfigWithMaxSubmissions = `<View>
  <Text name="text"/>
  <TextArea name="desc" toName="text" maxSubmissions="2" />
</View>`;

export const textareaConfigWithValueAndMaxSubmissions = `<View>
  <Text name="text"/>
  <TextArea name="desc" toName="text" value="Pre-filled text" maxSubmissions="2" />
</View>`;

export const textareaConfigWithSkipDuplicates = `<View>
  <Text name="text"/>
  <TextArea name="desc" toName="text" skipDuplicates="true" />
</View>`;

export const textareaSkipDuplicatesError = "There is already an entry with that text. Please enter unique text.";

export const textareaPerRegionRegionListData = {
  image: "/public/files/images/html_headers.png",
};

export const textareaPerRegionRegionListResult = [
  {
    id: "ocr_region_1",
    from_name: "bbox",
    to_name: "image",
    type: "rectangle",
    value: {
      x: 0.625,
      y: 1.183431952662722,
      width: 34.375,
      height: 5.719921104536489,
    },
  },
];

export const textareaPerRegionRegionListConfig = `<View>
  <Image name="image" value="$image"/>
  <Rectangle name="bbox" toName="image"/>
  <TextArea
    name="ocr"
    toName="image"
    editable="true"
    perRegion="true"
    displayMode="region-list"
    skipDuplicates="true"
    maxSubmissions="5"
    placeholder="Recognized Text"
  />
</View>`;
