export const recipes = [
  {
    title: "Bbox object detection",
    type: "community",
    group: "Computer Vision",
    image: "bbox.png",
    details: `<h1>Simple object detection</h1>
    <p>Sample config to label with bboxes</p>
    <p>You can configure labels and their colors</p>`,
    config: `<View>
  <Image name="image" value="$image"/>
  <RectangleLabels name="label" toName="image">
    <Label value="Airplane" background="green"/>
    <Label value="Car" background="blue"/>
  </RectangleLabels>
</View>`,
  },
  {
    title: "Polygon labeling",
    type: "community",
    group: "Computer Vision",
    image: "polygon.png",
    details: "",
    config: `<View>
  <Header value="Select label and click on image to start"/>
  <Image name="image" value="$image"/>
  <PolygonLabels name="label" toName="image"
                 strokeWidth="3" pointSize="small"
                 opacity="0.9">
    <Label value="Airplane" background="red"/>
    <Label value="Car" background="blue"/>
  </PolygonLabels>
</View>
`,
  },
  {
    title: "Named entity recognition",
    type: "community",
    group: "NLP",
    image: "text.png",
    config: `<View>
  <Labels name="label" toName="text">
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

  <Text name="text" value="$text"/>
</View>`,
  },
];
