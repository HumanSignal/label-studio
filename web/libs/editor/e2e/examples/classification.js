const config = `
<View>
  <Text name="text" value="Hello"></Text>

  <Number name="num" toName="text" min="1" max="10"/>
  <DateTime name="dt" toName="text" showDate="true" showTime="true"/>
  <TextArea name="txt" toName="text" editable="true"/>

  <Choices name="choices" toName="text">
    <Choice value="Choice 1" background="#5b5"/>
    <Choice value="Choice 2" background="#55f"/>
  </Choices>

  <Taxonomy name="taxonomy" toName="text">
    <Choice value="Choice 1" background="#5b5"/>
    <Choice value="Choice 2" background="#55f">
      <Choice value="Choice 2.1" background="#5b5"/>
      <Choice value="Choice 2.2" background="#55f"/>
    </Choice>
  </Taxonomy>
</View>

`;

const data = {
  url: 'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/audio/barradeen-emotional.mp3',
};

const result = [
  {
    'value': {
      'number': 2,
    },
    'id': 'W7wMwaYoa9',
    'from_name': 'num',
    'to_name': 'text',
    'type': 'number',
    'origin': 'manual',
  },
  {
    'value': {
      'datetime': '1991-05-22T09:17',
    },
    'id': 'xMvgTyP6e4',
    'from_name': 'dt',
    'to_name': 'text',
    'type': 'datetime',
    'origin': 'manual',
  },
  {
    'value': {
      'text': [
        'Hello',
        'World',
      ],
    },
    'meta': {
      'lead_time': 0
    },
    'id': '0yMHFegGSK',
    'from_name': 'txt',
    'to_name': 'text',
    'type': 'textarea',
    'origin': 'manual',
  },
  {
    'value': {
      'choices': [
        'Choice 1',
      ],
    },
    'id': 'dZyZ7Dx3uS',
    'from_name': 'choices',
    'to_name': 'text',
    'type': 'choices',
    'origin': 'manual',
  },
  {
    'value': {
      'taxonomy': [
        [
          'Choice 2',
          'Choice 2.1',
        ],
      ],
    },
    'id': '4IHbGrfa-P',
    'from_name': 'taxonomy',
    'to_name': 'text',
    'type': 'taxonomy',
    'origin': 'manual',
  },
];

const title = 'Classification Mixed';

module.exports = { config, data, result, title };
