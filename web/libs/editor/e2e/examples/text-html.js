const config = `
<View>
  <HyperTextLabels name="ner" toName="text">
    <Label value="Person"></Label>
    <Label value="Organization"></Label>
    <Label value="Date"></Label>
  </HyperTextLabels>
  <HyperText name="text" value="$text"></HyperText>
</View>
`;

const data = {
  text:
    '<div style="max-width: 750px"><div style="clear: both"><div style="float: right; display: inline-block; border: 1px solid #F2F3F4; background-color: #F8F9F9; border-radius: 5px; padding: 7px; margin: 10px 0;"><p><b>Jules</b>: No no, Mr. Wolfe, it\'s not like that. Your help is definitely appreciated.</p></div></div><div style="clear: both"><div style="float: right; display: inline-block; border: 1px solid #F2F3F4; background-color: #F8F9F9; border-radius: 5px; padding: 7px; margin: 10px 0;"><p><b>Vincent</b>: Look, Mr. Wolfe, I respect you. I just don\'t like people barking orders at me, that\'s all.</p></div></div><div style="clear: both"><div style="display: inline-block; border: 1px solid #D5F5E3; background-color: #EAFAF1; border-radius: 5px; padding: 7px; margin: 10px 0;"><p><b>The Wolf</b>: If I\'m curt with you, it\'s because time is a factor. I think fast, I talk fast, and I need you two guys to act fast if you want to get out of this. So pretty please, with sugar on top, clean the car.</p></div></div></div>',
};

const result = [
  {
    id: 'Umb_V5CIey',
    from_name: 'ner',
    to_name: 'text',
    type: 'hypertextlabels',
    origin: 'manual',
    value: {
      start: '/div[1]/div[2]/div[1]/p[1]/b[1]/text()[1]',
      end: '/div[1]/div[2]/div[1]/p[1]/text()[1]',
      startOffset: 0,
      endOffset: 17,
      globalOffsets: {
        start: 81,
        end: 105,
      },
      text: 'Vincent: Look, Mr. Wolfe',
      hypertextlabels: ['Date'],
    },
  },
  {
    id: 'FQKKGR1yv5',
    from_name: 'ner',
    to_name: 'text',
    type: 'hypertextlabels',
    origin: 'manual',
    value: {
      start: '/div[1]/div[1]/div[1]/p[1]/b[1]/text()[1]',
      end: '/div[1]/div[1]/div[1]/p[1]/b[1]/text()[1]',
      startOffset: 0,
      endOffset: 5,
      globalOffsets: {
        start: 0,
        end: 5,
      },
      text: 'Jules',
      hypertextlabels: ['Person'],
    },
  },
  {
    id: 'SLNxK0a8oW',
    from_name: 'ner',
    to_name: 'text',
    type: 'hypertextlabels',
    origin: 'manual',
    value: {
      start: '/div[1]/div[3]/div[1]/p[1]/b[1]/text()[1]',
      end: '/div[1]/div[3]/div[1]/p[1]/b[1]/text()[1]',
      startOffset: 0,
      endOffset: 8,
      globalOffsets: {
        start: 180,
        end: 188,
      },
      text: 'The Wolf',
      hypertextlabels: ['Person'],
    },
  },
  {
    id: 'fyHRX3DdNv',
    from_name: 'ner',
    to_name: 'text',
    type: 'hypertextlabels',
    origin: 'manual',
    value: {
      start: '/div[1]/div[1]/div[1]/p[1]/text()[1]',
      end: '/div[1]/div[2]/div[1]/p[1]/text()[1]',
      startOffset: 64,
      endOffset: 33,
      globalOffsets: {
        start: 69,
        end: 121,
      },
      text: 'appreciated.\\n\\nVincent: Look, Mr. Wolfe, I respect you.',
      hypertextlabels: ['Date'],
    },
  },
];

const title = 'HTML labeling';

module.exports = { config, data, result, title };
