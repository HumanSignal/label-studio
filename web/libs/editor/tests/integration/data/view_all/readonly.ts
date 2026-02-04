export const ratingConfig = `
<View>
    <Text name="text" value="$text" />
    <Rating name="rating" toName="text" />
</View>
`;

export const taxonomyConfig = `
<View>
    <Text name="text" value="$text" />
    <Taxonomy name="taxonomy" toName="text">
        <Choice value="A" />
        <Choice value="B" />
    </Taxonomy>
</View>
`;

export const audioConfig = `
<View>
    <Audio name="audio" value="$audio" />
    <Labels name="labels" toName="audio">
        <Label value="Area" />
    </Labels>
</View>
`;

export const audioPerRegionConfig = `
<View>
    <Audio name="audio" value="$audio" />
    <Labels name="labels" toName="audio">
        <Label value="Area" />
    </Labels>
    <Choices name="choices" toName="audio" perRegion="true">
        <Choice value="Per-region" />
    </Choices>
</View>
`;

export const textData = { text: "Hello World" };

export const audioData = { audio: "/public/files/barradeen-emotional.mp3" };

export const ratingResult = [
  {
    id: "4",
    from_name: "rating",
    to_name: "text",
    type: "rating",
    value: {
      rating: 3,
    },
  },
];

export const taxonomyResult = [
  {
    id: "5",
    from_name: "taxonomy",
    to_name: "text",
    type: "taxonomy",
    value: {
      taxonomy: [["A"]],
    },
  },
];

export const audioResult = [
  {
    id: "6",
    from_name: "labels",
    to_name: "audio",
    type: "labels",
    value: {
      labels: ["Area"],
      start: 3,
      end: 10,
    },
  },
];

export const vectorConfig = `
<View>
    <Image name="img" value="$image" />
    <VectorLabels name="vectorlabels" toName="img">
        <Label value="Road" />
        <Label value="Path" />
    </VectorLabels>
</View>
`;

export const imageData = {
  image: "https://htx-pub.s3.us-east-1.amazonaws.com/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg",
};

export const vectorResult = [
  {
    id: "vector1",
    from_name: "vectorlabels",
    to_name: "img",
    type: "vectorlabels",
    origin: "manual",
    value: {
      vertices: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 30, y: 15 },
      ],
      closed: false,
      vectorlabels: ["Road"],
    },
    original_width: 1920,
    original_height: 1280,
  },
];
