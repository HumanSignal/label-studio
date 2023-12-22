const config = `
<View>
  <ParagraphLabels name="ner" toName="text">
    <Label value="Important Stuff"></Label>
    <Label value="Random talk"></Label>
  </ParagraphLabels>
  <Paragraphs audioUrl="$audio" name="text" value="$dialogue" layout="dialogue" savetextresult="no" />
</View>
`;

const data = {
  audio: 'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/audio/barradeen-emotional.mp3',
  dialogue: [
    {
      start: 3.1,
      end: 5.6,
      author: 'Mia Wallace',
      text: 'Dont you hate that?',
    },
    {
      start: 4.2,
      duration: 3.1,
      author: 'Vincent Vega:',
      text: 'Hate what?',
    },
    {
      author: 'Mia Wallace:',
      text: 'Uncomfortable silences. Why do we feel its necessary to yak about nonsense in order to be comfortable?',
    },
    {
      start: 90,
      author: 'Vincent Vega:',
      text: 'I dont know. Thats a good question.',
    },
    {
      author: 'Mia Wallace:',
      text:
        'Thats when you know you found somebody really special. When you can just shut the door closed a minute, and comfortably share silence.',
    },
  ],
};

const result = [
  {
    id: 'ryzr4QdL93',
    from_name: 'ner',
    to_name: 'text',
    type: 'paragraphlabels',
    origin: 'manual',
    value: {
      start: '2',
      end: '4',
      startOffset: 0,
      endOffset: 134,
      paragraphlabels: ['Important Stuff'],
    },
  },
];

const title = 'Paragraphs';

module.exports = { config, data, result, title };
