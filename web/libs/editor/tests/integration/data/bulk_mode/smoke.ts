export const allTagsConfig = `
<View>
    <Audio name="audio" value="$audio" />
    <TextArea name="textarea" toName="audio"/>
    <Choices name="choices" toName="audio">
        <Choice value="choices_1" />
        <View>
            <Choice value="choices_2" />
        </View>
    </Choices>
    <Number name="number" toName="audio" />

    <Image name="image" value="$image" />
    <Brush name="brush" toName="image" />
    <BrushLabels name="brushlabels" toName="image">
        <Label value="brushlabels_1" />
    </BrushLabels>
    <Ellipse name="ellipse" toName="image" />
    <EllipseLabels name="ellipselabels" toName="image">
        <Label value="ellipselabels_1" />
    </EllipseLabels>
    <KeyPoint name="keypoint" toName="image" />
    <KeyPointLabels name="keypointlabels" toName="image">
        <Label value="keypointlabels_1" />
    </KeyPointLabels>
    <MagicWand name="magicwand" toName="image" />
    <Polygon name="polygon" toName="image" />
    <PolygonLabels name="polygonlabels" toName="image">
        <Label value="polygonlabels_1" />
    </PolygonLabels>

    <Paragraphs name="paragraphs" value="$paragraphs" />
    <ParagraphLabels name="paragraphlabels" toName="paragraphs">
        <Label value="paragraphlabels_1" />
    </ParagraphLabels>

    <Text name="text" value="$text" />
    <Labels name="labels" toName="text" value="$labels">
        <Label value="labels_1" />
    </Labels>

    <HyperText name="hypertext" value="$hypertext" />
    <HyperTextLabels name="hyperlabels" toName="hypertext" value="$hyperlabels">
        <Label value="hyperlabels_1" />
    </HyperTextLabels>

    <TimeSeries name="timeseries"
        valueType="json"
        value="$timeseries"
        timeColumn="time"
        overviewChannels="velocity"
    >
        <Channel column="value" />
    </TimeSeries>
    <DateTime name="date" toName="timeseries" />
    <TimeSeriesLabels name="timeserieslabels" toName="timeseries">
        <Label value="timeserieslabels_1" />
    </TimeSeriesLabels>

    <Video name="video" value="$video" />
    <VideoRectangle name="videorectangle" toName="video" />

    <Table name="table" value="$table" />
    <Taxonomy name="taxonomy" toName="table">
        <Choice value="taxonomy_1" />
    </Taxonomy>

    <List name="list" value="$list" />
    <Ranker name="rank" toName="list" />

    <Relations>
        <Relation value="similar" />
        <Relation value="dissimilar" />
    </Relations>

    <Collapse>
        <Panel value="First panel">
            <Choices name="panel_1_choices" toName="image">
                <Choice value="panel_1_choices_1" />
            </Choices>
        </Panel>
        <Panel value="$panel_2">
            <Choices name="panel_2_choices" toName="image">
                <Choice value="panel_2_choices_1" />
            </Choices>
        </Panel>
        <Panel value="$panel_not_exist">
            <Choices name="panel_3_choices" toName="image">
                <Choice value="panel_3_choices_1" />
            </Choices>
        </Panel>
        <Panel value="$panel_not_exist_2">
            <Labels name="panel_4_labels" toName="image">
                <Label value="panel_4_labels_1" />
            </Labels>
        </Panel>
    </Collapse>
</View>
`;

export const perRegionConfig = `
<View>
    <Image name="image" value="$image" />
    <Rectangle name="rectangle" toName="image" />
    <Choices name="choices" toName="image" perRegion="true">
        <Choice value="choices_1" />
        <View>
            <Choice value="choices_2" />
        </View>
    </Choices>
    <TextArea name="textarea" toName="image" perRegion="true"/>
    <Number name="number" toName="image" perRegion="true" />
    <DateTime name="date" toName="image" perRegion="true" />
</View>
`;

export const perItemMIGConfig = `<View>
    <Image name="image" valueList="$images"/>
    <Choices name="choices" toName="image" perItem="true">
        <Choice value="choices_1" />
        <View>
            <Choice value="choices_2" />
        </View>
    </Choices>
    <TextArea name="textarea" toName="image" perItem="true"/>
    <Number name="number" toName="image" perItem="true" />
    <DateTime name="date" toName="image" perItem="true" />
</View>`;

export const dynamicConfig = `<View>
    <Image name="image" value="$image"/>
    <Choices name="choices" toName="image" value="$choices">
        <Choice value="choices_1" />
    </Choices>
    <TextArea name="textarea" toName="image" value="$textarea"/>
</View>`;

export const allTagsSampleData = {
  audio: "/static/samples/game.wav",
  textarea: "Something",
  image: "/static/samples/sample.jpg",
  paragraphs: [
    {
      author: "Alice",
      text: "Hi, Bob.",
    },
    {
      author: "Bob",
      text: "Hello, Alice!",
    },
    {
      author: "Alice",
      text: "What's up?",
    },
    {
      author: "Bob",
      text: "Good. Ciao!",
    },
    {
      author: "Alice",
      text: "Bye, Bob.",
    },
  ],
  text: "To have faith is to trust yourself to the water",
  labels: [
    {
      value: "DynamicLabel1",
      background: "#ff0000",
    },
    {
      value: "DynamicLabel2",
      background: "#0000ff",
    },
  ],
  hypertext:
    '<div style="max-width: 750px"><div style="clear: both"><div style="float: right; display: inline-block; border: 1px solid #F2F3F4; background-color: #F8F9F9; border-radius: 5px; padding: 7px; margin: 10px 0;"><p><b>Jules</b>: No no, Mr. Wolfe, it\'s not like that. Your help is definitely appreciated.</p></div></div><div style="clear: both"><div style="float: right; display: inline-block; border: 1px solid #F2F3F4; background-color: #F8F9F9; border-radius: 5px; padding: 7px; margin: 10px 0;"><p><b>Vincent</b>: Look, Mr. Wolfe, I respect you. I just don\'t like people barking orders at me, that\'s all.</p></div></div><div style="clear: both"><div style="display: inline-block; border: 1px solid #D5F5E3; background-color: #EAFAF1; border-radius: 5px; padding: 7px; margin: 10px 0;"><p><b>The Wolf</b>: If I\'m curt with you, it\'s because time is a factor. I think fast, I talk fast, and I need you two guys to act fast if you want to get out of this. So pretty please, with sugar on top, clean the car.</p></div></div></div>',
  hyperlabels: [
    {
      value: "DynamicLabel1",
      background: "#ff0000",
    },
    {
      value: "DynamicLabel2",
      background: "#0000ff",
    },
  ],
  timeseries: {
    time: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
      31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58,
      59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86,
      87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99,
    ],
    value: [
      1.1393700565561184, 0.20582704993890064, -1.21497950745229, -1.8475063737801518, -0.9921640936838662,
      -1.7856764052654002, 0.08803347727939657, -0.30030806743697475, 1.1886285990561012, -0.8997862539954563,
      0.4386386140278205, -1.617681286537922, 1.0570918251017698, 0.3695480529252035, -0.8193787330027099,
      -1.6452726833960354, -0.20300362077113915, -0.9655914965805513, -0.5436994236105087, 1.3764502707321136,
      -0.07610240994539516, 0.009645716672409547, 1.1538673268929702, -0.08163253144562094, 1.3733527532107295,
      -1.0604906313482814, 0.6822721944838279, -0.747265839810174, 1.425576031959199, 3.111666837994423,
      -0.5575479617912177, -0.28367571432606675, -0.913926594859317, 0.9017484089920481, -0.23958534566950856,
      1.2309734907173973, -1.6002523044951367, -1.5260885270933928, 0.40390260840708536, -1.0389018115277513,
      1.9423513124098457, -0.1816417695958348, 0.0011235704235933379, -0.6119528614138618, 2.6595726046425017,
      0.3258537127236866, 1.8341358665725238, -1.683274818214394, -0.2665203538102121, -1.5196270317166107,
      0.12318788578554503, 1.349843886108512, -0.49489850459516155, -0.8027783785971654, 1.8745981568237153,
      0.5617289099765608, -0.6930023528515767, 0.5124410381811476, 0.35716862621283524, -1.6083279086774749,
      -0.8563171224625595, 0.6103553122342722, 0.29119600710898735, -0.5062927873950588, 0.7202372819487668,
      -0.556379796388418, 0.5042291138403985, 1.6908081057886755, -0.11727020985448582, 1.4691843985112925,
      -0.9777469139568521, -0.5978518348285874, 0.10788873147183885, -0.9872748684442015, -0.9670450247890969,
      0.5202384215780459, -0.650952517939342, -0.8386557602812781, 2.271626152656259, 0.1193771902186821,
      -0.21481510320485592, -1.5745360063327152, -0.3638714349463393, -1.724314328414918, 0.19847261441835293,
      -0.39445345287931144, 0.6040967817549395, -0.254140452574494, 0.4615027200678019, -0.026514865719184152,
      -0.5613417378438901, -0.651165223727383, -0.6320938538500689, -0.693915469899149, -0.29540004821017224,
      -0.02136517411410101, -0.05453917109641203, 0.23405947261470622, 0.5217008076413946, 1.5041477814013535,
    ],
  },
  video: "/static/samples/opossum_snow.mp4",
  table: {
    "Card number": 18799210,
    "First name": "Max",
    "Last name": "Nobel",
  },
  taxonomy: "Something",
  list: [
    {
      id: 1,
      title: "The Amazing World of Opossums",
      body: "Opossums are fascinating marsupials native to North America. They have prehensile tails, which help them to climb trees and navigate their surroundings with ease. Additionally, they are known for their unique defense mechanism, called 'playing possum,' where they mimic the appearance and smell of a dead animal to deter predators.",
    },
    {
      id: 2,
      title: "Opossums: Nature's Pest Control",
      body: "Opossums play a crucial role in controlling insect and rodent populations, as they consume a variety of pests like cockroaches, beetles, and mice. This makes them valuable allies for gardeners and homeowners, as they help to maintain a balanced ecosystem and reduce the need for chemical pest control methods.",
    },
    {
      id: 3,
      title: "Fun Fact: Opossums Are Immune to Snake Venom",
      body: "One surprising characteristic of opossums is their natural immunity to snake venom. They have a unique protein in their blood called 'Lethal Toxin-Neutralizing Factor' (LTNF), which neutralizes venom from a variety of snake species, including rattlesnakes and cottonmouths. This allows opossums to prey on snakes without fear of harm, further highlighting their important role in the ecosystem.",
    },
  ],
  panel_2: "Another panel",
};

export const simpleMIGData = {
  images: [
    "https://data.heartex.net/open-images/train_0/mini/0030019819f25b28.jpg",
    "https://data.heartex.net/open-images/train_0/mini/00155094b7acc33b.jpg",
    "https://data.heartex.net/open-images/train_0/mini/00133643bbf063a9.jpg",
    "https://data.heartex.net/open-images/train_0/mini/0061ec6e9576b520.jpg",
  ],
};

export const dynamicData = {
  $image: "https://data.heartex.net/open-images/train_0/mini/0030019819f25b28.jpg",
  $choices: [{ value: "choices_1" }],
  $textarea: "Something",
};
