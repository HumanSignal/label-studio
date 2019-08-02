/**
 * Object with configs for test
 * TODO: sorting other configs
 */
const configEnv = {
  default: {
    config: `<View><Text name="txt-1" value="$text"></Text></View>`,
    data: {
      text: `mobx-state-tree is a state container that combines the simplicity and ease of mutable data with the traceability of immutable data and the reactiveness and performance of observable data.
      Simply put, mobx-state-tree tries to combine the best features of both immutability (transactionality, traceability and composition) and mutability (discoverability, co-location and encapsulation) based approaches to state management; everything to provide the best developer experience possible. Unlike MobX itself, mobx-state-tree is very opinionated about how data should be structured and updated. This makes it possible to solve many common problems out of the box.
      Central in MST (mobx-state-tree) is the concept of a living tree. The tree consists of mutable, but strictly protected objects enriched with runtime type information. In other words, each tree has a shape (type information) and state (data). From this living tree, immutable, structurally shared, snapshots are automatically generated.`,
    },
    task: {
      id: 402324,
      completions: [],
      meta: {},
      accuracy: 0.0,
      created_at: "2019-06-14T15:15:47.982764Z",
      updated_at: "2019-06-14T15:15:47.982771Z",
      is_labeled: false,
      exposed: true,
      project: 139,
    },
  },
  gptc: {
    config: `<View>
        <Text name="mytext" value="$text"></Text>
        <Choices name="mytext_class" toName="mytext" choice="single">
          <Choice value="important" alias="Important document"></Choice>
          <Choice value="other" alias="Other"></Choice>
        </Choices>
      </View>`,
    data: {
      text: `mobx-state-tree is a state container that combines the simplicity and ease of mutable data with the traceability of immutable data and the reactiveness and performance of observable data.
      Simply put, mobx-state-tree tries to combine the best features of both immutability (transactionality, traceability and composition) and mutability (discoverability, co-location and encapsulation) based approaches to state management; everything to provide the best developer experience possible. Unlike MobX itself, mobx-state-tree is very opinionated about how data should be structured and updated. This makes it possible to solve many common problems out of the box.
      Central in MST (mobx-state-tree) is the concept of a living tree. The tree consists of mutable, but strictly protected objects enriched with runtime type information. In other words, each tree has a shape (type information) and state (data). From this living tree, immutable, structurally shared, snapshots are automatically generated.`,
    },
    task: {
      id: 402324,
      completions: [],
      meta: {},
      accuracy: 0.0,
      created_at: "2019-06-14T15:15:47.982764Z",
      updated_at: "2019-06-14T15:15:47.982771Z",
      is_labeled: false,
      exposed: true,
      project: 139,
    },
  },
  ner: {
    config: `<View>
    <Labels name="ner" toName="text">
      <Label value="Person"></Label>
      <Label value="Organization"></Label>
      <Label value="Fact"></Label>
      <Label value="Money"></Label>
      <Label value="Date"></Label>
      <Label value="Time"></Label>
      <Label value="Ordinal"></Label>
      <Label value="Percent"></Label>
      <Label value="Product"></Label>
      <Label value="Language"></Label>
      <Label value="Location"></Label>
    </Labels>
    <Text name="text" value="$text"></Text>
  </View>`,
    data: {
      text: `mobx-state-tree is a state container that combines the simplicity and ease. Apple's and 😋App Store are still broken http://t.co/gIrx8G4pcC http://t.co/fwTXH2aSvC`,
      texta: "To have faith is to trust yourself to the water",
    },
    task: {
      id: 402324,
      completions: [
        {
          id: 137601,
          model_version: "2019-04-10 10:52:20.591839",
          result: [
            {
              id: "RuJ2GrJyG8",
              from_name: "ner",
              to_name: "text",
              source: "$text",
              type: "labels",
              value: {
                start: 8,
                end: 12,
                text: "faith",
                labels: ["Fact"],
              },
            },
          ],
          score: 1.0,
          created_at: "2019-04-10T10:53:28.822843Z",
          updated_at: "2019-04-10T10:53:28.822851Z",
          task: 71937,
          was_generated: true,
        },
      ],
      meta: {},
      accuracy: 0.0,
      created_at: "2019-06-14T15:15:47.982764Z",
      updated_at: "2019-06-14T15:15:47.982771Z",
      is_labeled: false,
      exposed: true,
      project: 139,
    },
  },
  bbox: {
    config: `<View>
        <RectangleLabels name="tag" toName="image">
          <Label value="Cat"></Label>
          <Label value="Dog" background="blue"></Label>
        </RectangleLabels>
        <Image name="image" value="$image_url"></Image>
      </View>
    `,
    task: {
      id: 402324,
      meta: {},
      accuracy: 0.0,
      created_at: "2019-06-14T15:15:47.982764Z",
      updated_at: "2019-06-14T15:15:47.982771Z",
      is_labeled: false,
      exposed: true,
      project: 139,
      completions: [],
    },
    data: {
      image_url: "https://go.heartex.net/static/samples/kittens.jpg",
    },
  },
  image: {
    config: `<View> <Image name="image" value="$image_url"/> <Choices name="cats_or_dogs" toName="image">   <Choice value="Cat"></Choice>   <Choice value="Dog"></Choice> </Choices></View>`,
    data: {
      image_url: "http://s3.amazonaws.com/heartex-private/cats_n_dogs/training_set/dogs/dog.887.jpg",
    },
    task: {
      id: 402324,
      meta: {},
      accuracy: 0.0,
      created_at: "2019-06-14T15:15:47.982764Z",
      updated_at: "2019-06-14T15:15:47.982771Z",
      exposed: true,
      project: 139,
      completions: [
        {
          completed_by: null,
          created_ago: "2 months",
          created_at: "2019-05-14T05:02:41.289000Z",
          created_username: "",
          honeypot: true,
          id: 1430,
          result: '[{"type":"choices","value":{"choices":["Dog"]},"to_name":"image","from_name":"cats_or_dogs"}]',
          state: "{}",
          task: 163260,
          updated_at: "2019-05-14T05:02:41.289000Z",
          was_cancelled: false,
          was_generated: true,
        },
      ],
    },
  },
  cda: {
    config: `<View>
    <HyperText name="dialog" value="$dialogs"></HyperText>
    <Header value="Rate last answer:"></Header>
    <Choices name="chc-1" choice="single-radio" toName="dialog">
      <Choice value="Bad answer"></Choice>
      <Choice value="Neutral answer"></Choice>
      <Choice value="Good answer"></Choice>
    </Choices>
    <Header value="Your answer:"></Header>
    <TextArea name="answer"></TextArea>
  </View>`,
    task: {},
    data: {},
  },
  dialog: {
    config: `<View>
        <Header value="Select choice:"></Header>
        <Dialog value="$dialoga" name="dial"></Dialog>
        <Choices showInline="true" name="mytext_class" toName="dial">
          <Choice value="important"></Choice>
          <Choice value="other"></Choice>
        </Choices>
      </View>`,
    task: {
      id: 402324,
      completions: [
        {
          completed_by: 55,
          created_ago: "16 hours, 57 minutes",
          created_at: "2019-07-19T17:48:15.465239Z",
          created_username: "",
          honeypot: false,
          id: 8440,
          result: '[{"type":"choices","value":{"choices":["important"]},"to_name":"dial","from_name":"mytext_class"}]',
          task: 761928,
          updated_at: "2019-07-19T17:48:15.465264Z",
          was_cancelled: false,
          was_generated: true,
        },
      ],
      meta: {},
      accuracy: 0.0,
      created_at: "2019-06-14T15:15:47.982764Z",
      updated_at: "2019-06-14T15:15:47.982771Z",
      is_labeled: false,
      exposed: true,
      project: 139,
    },

    data: {
      dialoga: [
        {
          name: "Jules Winnfield",
          text: "Okay, so, tell me about the hash bars",
          id: 100,
        },
        {
          name: "Vasya",
          text: "So what you want to know?",
          date: "1 August, 2019",
        },
        {
          name: "Jules Winnfield",
          text: "Well, hash is legal there, right?",
          selected: true,
          date: "1 August, 2019",
        },
        {
          name: "Vincу",
          text:
            "Yeah, it's legal, but it ain't a hundred percent legal. I mean, you can't walk into a restaurant,\n   roll a joint, and start puffin' away. They want you to smoke in your home or certain designated places.",
        },
        {
          name: "Jules Winnfield",
          text: "Those are hash bars?",
        },
        {
          name: "Vincent Vega",
          text:
            "Breaks down like this, okay: it's legal to buy it,\n   it's legal to own it, and if you're the proprietor of a hash bar, it's legal to sell it. It's illegal to carry it,\n   but that doesn't really matter 'cause, get a load of this, all right; if you get stopped by the cops in Amsterdam,\n   it's illegal for them to search you. I mean, that's a right the cops in Amsterdam don't have.",
        },
        {
          name: "Vincent Vega",
          text:
            "Yeah, it's legal, but it ain't a hundred percent legal. I mean, you can't walk into a restaurant,\n   roll a joint, and start puffin' away. They want you to smoke in your home or certain designated places.",
        },
        {
          name: "Jules Winnfield",
          text: "Those are hash bars?",
        },
        {
          name: "Vincent Vega",
          text:
            "Breaks down like this, okay: it's legal to buy it,\n   it's legal to own it, and if you're the proprietor of a hash bar, it's legal to sell it. It's illegal to carry it,\n   but that doesn't really matter 'cause, get a load of this, all right; if you get stopped by the cops in Amsterdam,\n   it's illegal for them to search you. I mean, that's a right the cops in Amsterdam don't have.",
        },
        {
          name: "Vincent Vega",
          text:
            "Yeah, it's legal, but it ain't a hundred percent legal. I mean, you can't walk into a restaurant,\n   roll a joint, and start puffin' away. They want you to smoke in your home or certain designated places.",
        },
        {
          name: "Jules Winnfield",
          text: "Those are hash bars?",
        },
        {
          name: "Vincent Vega",
          text:
            "Breaks down like this, okay: it's legal to buy it,\n   it's legal to own it, and if you're the proprietor of a hash bar, it's legal to sell it. It's illegal to carry it,\n   but that doesn't really matter 'cause, get a load of this, all right; if you get stopped by the cops in Amsterdam,\n   it's illegal for them to search you. I mean, that's a right the cops in Amsterdam don't have.",
        },
      ],
    },
  },
  audio: {
    config: `<View>
        <Header value="Select label:"></Header>
        <Labels name="label" toName="audio">
          <Label value="Politics" background="red"></Label>
          <Label value="Business" background="blue"></Label>
          <Label value="Education"></Label>
        </Labels>
        <Header value="Select audio region:"></Header>
        <AudioPlus name="audio" value="$url"></AudioPlus>
      </View>`,

    task: {
      id: 402324,
      completions: [
        {
          completed_by: 55,
          created_ago: "16 hours, 57 minutes",
          created_at: "2019-07-19T17:48:15.465239Z",
          created_username: "",
          honeypot: false,
          id: 8440,
          result: `[{"id":"XPxpLMifV7","from_name":"label","to_name":"audio","source":"$url","type":"labels","value":{"start":0.7047114876227649,"end":2.369030107327593,"labels":["Politics"]}},{"id":"6ycG2nV3mp","from_name":"label","to_name":"audio","source":"$url","type":"labels","value":{"start":2.6014349596287176,"end":5.982550714074112,"labels":["Business"]}}]`,
          task: 761928,
          updated_at: "2019-07-19T17:48:15.465264Z",
          was_cancelled: false,
        },
      ],
      meta: {},
      accuracy: 0.0,
      created_at: "2019-06-14T15:15:47.982764Z",
      updated_at: "2019-06-14T15:15:47.982771Z",
      is_labeled: false,
      exposed: true,
      project: 139,
    },

    data: {
      url: "https://s3-us-west-1.amazonaws.com/heartex-public/cello.mp3",
    },
  },
};

export default configEnv;
