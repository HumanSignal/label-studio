export const simpleData = {
  text: 'This text exists for no reason',
};

export const dataWithPrediction =
  {
    'data': {
      'text': 'Calif. wildfires signal the arrival of a planetary fire age https://t.co/Vvo9noqQfA',
    },
    'annotations': [
      {
        'result': [
          {
            'id': 'n2ldmNpSQI',
            'type': 'taxonomy',
            'value': {
              'taxonomy': [
                [
                  'Archaea',
                ],
                [
                  'Bacteria',
                ],
              ],
            },
            'origin': 'manual',
            'to_name': 'text',
            'from_name': 'taxonomy',
          },
        ],
        'ground_truth': false,
        'model_version': 'model 0',
        'score': 0.425405738240795,
      },
    ],
    'predictions': [
      {
        'result': [
          {
            'id': 'n2ldmNpSQI',
            'type': 'taxonomy',
            'value': {
              'taxonomy': [
                [
                  'Archaea',
                ],
                [
                  'Bacteria',
                ],
              ],
            },
            'origin': 'manual',
            'to_name': 'text',
            'from_name': 'taxonomy',
          },
        ],
        'ground_truth': false,
        'model_version': 'model 0',
        'score': 0.425405738240795,
      },
    ],
  };

export const taxonomyConfig = `<View>
  <Text name="text" value="$text"/>
  <Taxonomy name="choices" toName="text">
    <Choice value="Choice 1" alias="C1" />
    <Choice value="Choice 2" alias="C2" hint="A hint for Choice 2" />
    <Choice value="Choice 3" selected="true" />
  </Taxonomy>
</View>`;
export const taxonomyConfigWithMaxUsages = `<View>
  <Text name="text" value="$text"/>
  <Taxonomy name="taxonomy" toName="text" maxUsages="1">
    <Choice value="Archaea" />
    <Choice value="Bacteria" />
    <Choice value="Eukarya" />
  </Taxonomy>
</View>`;

export const dynamicData = {
  text: 'This text exists for no reason',
  items: [
    { value: 'Choice 1' },
    { value: 'Choice 2', hint: 'A hint for Choice 2' },
    { value: 'Choice 3', selected: true },
  ],
};

export const taxonomyDataWithSimilarAliases = {
  text: 'This text exists for no reason',
  items: [
    { value: 'Book 1', alias: '1', children: [
      { value: 'Chapter 1', alias: '1' },
      { value: 'Chapter 2', alias: '2', children: [
        { value: 'Section 2.1', alias: '1' },
        { value: 'Section 2.2', alias: '2' },
        { value: 'Section 2.3', alias: '3' },
      ] },
      { value: 'Chapter 3', alias: '3', children: [
        { value: 'Section 3.1', alias: '1' },
        { value: 'Section 3.2', alias: '2' },
        { value: 'Section 3.3', alias: '3' },
      ] },
    ] },
    { value: 'Book 2', alias: '2', children: [
      { value: 'Chapter 1', alias: '1' },
      { value: 'Chapter 2', alias: '2', children: [
        { value: 'Section 2.1', alias: '1' },
        { value: 'Section 2.2', alias: '2' },
        { value: 'Section 2.3', alias: '3' },
      ] },
    ] },
    { value: 'Book 3', alias: '3' },
  ],
};

export const taxonomyResultWithSimilarAliases = {
  'id': 'aliased',
  'type': 'taxonomy',
  'value': {
    'taxonomy': [['1', '2', '1']],
  },
  'to_name': 'text',
  'from_name': 'choices',
};

export const dynamicTaxonomyConfig = `<View>
  <Text name="text" value="$text"/>
  <Taxonomy name="choices" toName="text" value="$items" showFullPath="true"/>
</View>`;


type TaxonomyOptions = {
  showFullPath?: boolean,
};
export const buildDynamicTaxonomyConfig = (options: TaxonomyOptions) => `<View>
  <Text name="text" value="$text"/>
  <Taxonomy
    name="choices"
    toName="text"
    value="$items"
    showFullPath="${JSON.stringify(options.showFullPath ?? false)}"
  />
</View>`;

export const taxonomyResultWithAlias = {
  'id': 'aliased',
  'type': 'taxonomy',
  'value': {
    'taxonomy': [['C2']],
  },
  'origin': 'manual',
  'to_name': 'text',
  'from_name': 'choices',
};
