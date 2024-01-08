export const simpleImageData = {
  image: 'https://data.heartex.net/open-images/train_0/mini/0030019819f25b28.jpg',
};
export const simpleMIGData = {
  images: [
    'https://data.heartex.net/open-images/train_0/mini/0030019819f25b28.jpg',
    'https://data.heartex.net/open-images/train_0/mini/00155094b7acc33b.jpg',
    'https://data.heartex.net/open-images/train_0/mini/00133643bbf063a9.jpg',
    'https://data.heartex.net/open-images/train_0/mini/0061ec6e9576b520.jpg',
  ],
};

/* <DateTime /> */
export const simpleImageDateTimeConfig = `<View>
  <Image name="image" value="$image"/>
  <DateTime name="datetime" toName="image" />
</View>`;

export const perTagMIGDateTimeConfig = `<View>
  <Image name="image" valueList="$images"/>
  <DateTime name="datetime" toName="image" />
</View>`;

export const perRegionMIGDateTimeConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Rectangle name="rect" toName="image" />
  <DateTime name="datetime" toName="image" perRegion="true" />
</View>`;

export const perItemMIGDateTimeConfig = `<View>
  <Image name="image" valueList="$images"/>
  <DateTime name="datetime" toName="image" perItem="true" />
</View>`;

export const requiredPerTagMIGDateTimeConfig = `<View>
  <Image name="image" valueList="$images"/>
  <DateTime name="datetime" toName="image" required="true" />
</View>`;

export const requiredPerRegionMIGDateTimeConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Rectangle name="rect" toName="image" />
  <DateTime name="datetime" toName="image" perRegion="true" required="true" />
</View>`;

export const requiredPerItemMIGDateTimeConfig = `<View>
  <Image name="image" valueList="$images"/>
  <DateTime name="datetime" toName="image" perItem="true" required="true" />
</View>`;

/* <Choices /> */
export const simpleImageChoicesConfig = `<View>
  <Image name="image" value="$image"/>
  <Choices name="choices" toName="image">
    <Choice value="Choice 1" />
    <Choice value="Choice 2" />
    <Choice value="Choice 3" />
  </Choices>
</View>`;

export const perTagMIGChoicesConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Choices name="choices" toName="image">
    <Choice value="Choice 1" />
    <Choice value="Choice 2" />
    <Choice value="Choice 3" />
  </Choices>
</View>`;

export const perRegionMIGChoicesConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Rectangle name="rect" toName="image" />
  <Choices name="choices" toName="image" perRegion="true">
    <Choice value="Choice 1" />
    <Choice value="Choice 2" />
    <Choice value="Choice 3" />
  </Choices>
</View>`;

export const perItemMIGChoicesConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Choices name="choices" toName="image" perItem="true">
    <Choice value="Choice 1" />
    <Choice value="Choice 2" />
    <Choice value="Choice 3" />
  </Choices>
</View>`;

export const requiredPerTagMIGChoicesConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Choices name="choices" toName="image" required="true" >
    <Choice value="Choice 1" />
    <Choice value="Choice 2" />
    <Choice value="Choice 3" />
  </Choices>
</View>`;

export const requiredPerRegionMIGChoicesConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Rectangle name="rect" toName="image" />
  <Choices name="choices" toName="image" perRegion="true" required="true">
    <Choice value="Choice 1" />
    <Choice value="Choice 2" />
    <Choice value="Choice 3" />
  </Choices>
</View>`;

export const requiredPerItemMIGChoicesConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Choices name="choices" toName="image" perItem="true" required="true">
    <Choice value="Choice 1" />
    <Choice value="Choice 2" />
    <Choice value="Choice 3" />
  </Choices>
</View>`;

/* <Number /> */
export const simpleImageNumberConfig = `<View>
  <Image name="image" value="$image"/>
  <Number name="number" toName="image" />
</View>`;

export const perTagMIGNumberConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Number name="number" toName="image" />
</View>`;

export const perRegionMIGNumberConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Rectangle name="rect" toName="image" />
  <Number name="number" toName="image" perRegion="true" />
</View>`;

export const perItemMIGNumberConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Number name="number" toName="image" perItem="true" />
</View>`;

export const requiredPerTagMIGNumberConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Number name="number" toName="image" required="true" />
</View>`;

export const requiredPerRegionMIGNumberConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Rectangle name="rect" toName="image" />
  <Number name="number" toName="image" perRegion="true" required="true" />
</View>`;

export const requiredPerItemMIGNumberConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Number name="number" toName="image" perItem="true" required="true" />
</View>`;

/* <Rating /> */
export const simpleImageRatingConfig = `<View>
  <Image name="image" value="$image"/>
  <Rating name="rating" toName="image" />
</View>`;

export const perTagMIGRatingConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Rating name="rating" toName="image" />
</View>`;

export const perRegionMIGRatingConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Rectangle name="rect" toName="image" />
  <Rating name="rating" toName="image" perRegion="true" />
</View>`;

export const perItemMIGRatingConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Rating name="rating" toName="image" perItem="true" />
</View>`;

export const requiredPerTagMIGRatingConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Rating name="rating" toName="image" required="true" />
</View>`;

export const requiredPerRegionMIGRatingConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Rectangle name="rect" toName="image" />
  <Rating name="rating" toName="image" perRegion="true" required="true" />
</View>`;

export const requiredPerItemMIGRatingConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Rating name="rating" toName="image" perItem="true" required="true" />
</View>`;

/* <Taxonomy /> */
export const simpleImageTaxonomyConfig = `<View>
  <Image name="image" value="$image"/>
  <Taxonomy name="taxonomy" toName="image">
    <Choice value="Choice 1" />
    <Choice value="Choice 2" />
    <Choice value="Choice 3" />
  </Taxonomy>
</View>`;

export const perTagMIGTaxonomyConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Taxonomy name="taxonomy" toName="image">
    <Choice value="Choice 1" />
    <Choice value="Choice 2" />
    <Choice value="Choice 3" />
  </Taxonomy>
</View>`;

export const perRegionMIGTaxonomyConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Rectangle name="rect" toName="image" />
  <Taxonomy name="taxonomy" toName="image" perRegion="true">
    <Choice value="Choice 1" />
    <Choice value="Choice 2" />
    <Choice value="Choice 3" />
  </Taxonomy>
</View>`;

export const perItemMIGTaxonomyConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Taxonomy name="taxonomy" toName="image" perItem="true">
    <Choice value="Choice 1" />
    <Choice value="Choice 2" />
    <Choice value="Choice 3" />
  </Taxonomy>
</View>`;

export const requiredPerTagMIGTaxonomyConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Taxonomy name="taxonomy" toName="image" required="true" >
    <Choice value="Choice 1" />
    <Choice value="Choice 2" />
    <Choice value="Choice 3" />
  </Taxonomy>
</View>`;

export const requiredPerRegionMIGTaxonomyConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Rectangle name="rect" toName="image" />
  <Taxonomy name="taxonomy" toName="image" perRegion="true" required="true">
    <Choice value="Choice 1" />
    <Choice value="Choice 2" />
    <Choice value="Choice 3" />
  </Taxonomy>
</View>`;

export const requiredPerItemMIGTaxonomyConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Taxonomy name="taxonomy" toName="image" perItem="true" required="true">
    <Choice value="Choice 1" />
    <Choice value="Choice 2" />
    <Choice value="Choice 3" />
  </Taxonomy>
</View>`;

/* <Textarea /> */
export const simpleImageTextareaConfig = `<View>
  <Image name="image" value="$image"/>
  <Textarea name="textarea" toName="image" />
</View>`;

export const perTagMIGTextareaConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Textarea name="textarea" toName="image" />
</View>`;

export const perRegionMIGTextareaConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Rectangle name="rect" toName="image" />
  <Textarea name="textarea" toName="image" perRegion="true" />
</View>`;

export const perItemMIGTextareaConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Textarea name="textarea" toName="image" perItem="true" />
</View>`;

export const requiredPerTagMIGTextareaConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Textarea name="textarea" toName="image" required="true" />
</View>`;

export const requiredPerRegionMIGTextareaConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Rectangle name="rect" toName="image" />
  <Textarea name="textarea" toName="image" perRegion="true" required="true" />
</View>`;

export const requiredPerItemMIGTextareaConfig = `<View>
  <Image name="image" valueList="$images"/>
  <Textarea name="textarea" toName="image" perItem="true" required="true" />
</View>`;

export const perRegionRegionsResult = [
  {
    'id': 'rect_1',
    'type': 'rectangle',
    'from_name': 'rect',
    'to_name': 'image',
    'item_index': 0,
    'value': {
      'x': 10,
      'y': 10,
      'width': 35,
      'height': 80,
    },
  },
  {
    'id': 'rect_2',
    'type': 'rectangle',
    'from_name': 'rect',
    'to_name': 'image',
    'item_index': 1,
    'value': {
      'x': 55,
      'y': 10,
      'width': 35,
      'height': 80,
    },
  },
];

/* <DateTime /> */
export const perTagDateTimeResult = [
  {
    'id': 'datetime_1',
    'type': 'datetime',
    'from_name': 'datetime',
    'to_name': 'image',
    'value': {
      'datetime': '2000-01-01T01:01',
    },
  },
];

export const perRegionDateTimeResult = [
  {
    'id': 'rect_1',
    'type': 'rectangle',
    'from_name': 'rect',
    'to_name': 'image',
    'value': {
      'x': 0,
      'y': 0,
      'width': 50,
      'height': 100,
    },
  },
  {
    'id': 'rect_1',
    'type': 'datetime',
    'from_name': 'datetime',
    'to_name': 'image',
    'value': {
      'datetime': '2000-01-01T01:01',
      'x': 0,
      'y': 0,
      'width': 50,
      'height': 100,
    },
  },
  {
    'id': 'rect_2',
    'type': 'rectangle',
    'from_name': 'rect',
    'to_name': 'image',
    'value': {
      'x': 50,
      'y': 0,
      'width': 50,
      'height': 100,
    },
  },
];

export const perItemDateTimeResult = [
  {
    'id': 'datetime_1',
    'type': 'datetime',
    'from_name': 'datetime',
    'to_name': 'image',
    'value': {
      'datetime': '2000-01-01T01:01',
    },
    'item_index': 0,
  },
  {
    'id': 'datetime_2',
    'type': 'datetime',
    'from_name': 'datetime',
    'to_name': 'image',
    'value': {
      'datetime': '2000-02-02T02:02',
    },
    'item_index': 1,
  },
  {
    'id': 'datetime_3',
    'type': 'datetime',
    'from_name': 'datetime',
    'to_name': 'image',
    'value': {
      'datetime': '2000-03-03T03:03',
    },
    'item_index': 2,
  },
];

/* <Choices /> */
export const perTagChoicesResult = [
  {
    'id': 'choice_1',
    'type': 'choices',
    'from_name': 'choices',
    'to_name': 'image',
    'value': {
      'choices': [
        'Choice 1',
      ],
    },
  },
];

export const perRegionChoicesResult = [
  {
    'id': 'rect_1',
    'type': 'rectangle',
    'from_name': 'rect',
    'to_name': 'image',
    'value': {
      'x': 0,
      'y': 0,
      'width': 50,
      'height': 100,
    },
  },
  {
    'id': 'rect_1',
    'type': 'choices',
    'from_name': 'choices',
    'to_name': 'image',
    'value': {
      'x': 0,
      'y': 0,
      'width': 50,
      'height': 100,
      'choices': [
        'Choice 2',
      ],
    },
  },
  {
    'id': 'rect_2',
    'type': 'rectangle',
    'from_name': 'rect',
    'to_name': 'image',
    'value': {
      'x': 50,
      'y': 0,
      'width': 50,
      'height': 100,
    },
  },
];

export const perItemChoicesResult = [
  {
    'id': 'choice_1',
    'type': 'choices',
    'from_name': 'choices',
    'to_name': 'image',
    'value': {
      'choices': [
        'Choice 1',
      ],
    },
    'item_index': 0,
  },
  {
    'id': 'choice_2',
    'type': 'choices',
    'from_name': 'choices',
    'to_name': 'image',
    'value': {
      'choices': [
        'Choice 2',
      ],
    },
    'item_index': 1,
  },
  {
    'id': 'choice_3',
    'type': 'choices',
    'from_name': 'choices',
    'to_name': 'image',
    'value': {
      'choices': [
        'Choice 3',
      ],
    },
    'item_index': 2,
  },
];

/* <Number /> */
export const perTagNumberResult = [
  {
    'id': 'number_1',
    'type': 'number',
    'from_name': 'number',
    'to_name': 'image',
    'value': {
      'number': 123,
    },
  },
];

export const perRegionNumberResult = [
  {
    'id': 'rect_1',
    'type': 'rectangle',
    'from_name': 'rect',
    'to_name': 'image',
    'value': {
      'x': 0,
      'y': 0,
      'width': 50,
      'height': 100,
    },
  },
  {
    'id': 'rect_1',
    'type': 'number',
    'from_name': 'number',
    'to_name': 'image',
    'value': {
      'number': 123,
      'x': 0,
      'y': 0,
      'width': 50,
      'height': 100,
    },
  },
  {
    'id': 'rect_2',
    'type': 'rectangle',
    'from_name': 'rect',
    'to_name': 'image',
    'value': {
      'x': 50,
      'y': 0,
      'width': 50,
      'height': 100,
    },
  },
];

export const perItemNumberResult = [
  {
    'id': 'number_1',
    'type': 'number',
    'from_name': 'number',
    'to_name': 'image',
    'value': {
      'number': 123,
    },
    'item_index': 0,
  },
  {
    'id': 'number_2',
    'type': 'number',
    'from_name': 'number',
    'to_name': 'image',
    'value': {
      'number': 456,
    },
    'item_index': 1,
  },
  {
    'id': 'number_3',
    'type': 'number',
    'from_name': 'number',
    'to_name': 'image',
    'value': {
      'number': 789,
    },
    'item_index': 2,
  },
];

/* <Rating /> */
export const perTagRatingResult = [
  {
    'id': 'rating_1',
    'type': 'rating',
    'from_name': 'rating',
    'to_name': 'image',
    'value': {
      'rating': 4,
    },
  },
];

export const perRegionRatingResult = [
  {
    'id': 'rect_1',
    'type': 'rectangle',
    'from_name': 'rect',
    'to_name': 'image',
    'value': {
      'x': 0,
      'y': 0,
      'width': 50,
      'height': 100,
    },
  },
  {
    'id': 'rect_1',
    'type': 'rating',
    'from_name': 'rating',
    'to_name': 'image',
    'value': {
      'rating': 4,
      'x': 0,
      'y': 0,
      'width': 50,
      'height': 100,
    },
  },
  {
    'id': 'rect_2',
    'type': 'rectangle',
    'from_name': 'rect',
    'to_name': 'image',
    'value': {
      'x': 50,
      'y': 0,
      'width': 50,
      'height': 100,
    },
  },
];

export const perItemRatingResult = [
  {
    'id': 'rating_1',
    'type': 'rating',
    'from_name': 'rating',
    'to_name': 'image',
    'value': {
      'rating': 3,
    },
    'item_index': 0,
  },
  {
    'id': 'rating_2',
    'type': 'rating',
    'from_name': 'rating',
    'to_name': 'image',
    'value': {
      'rating': 4,
    },
    'item_index': 1,
  },
  {
    'id': 'rating_3',
    'type': 'rating',
    'from_name': 'rating',
    'to_name': 'image',
    'value': {
      'rating': 5,
    },
    'item_index': 2,
  },
];

/* <Taxonomy /> */
export const perTagTaxonomyResult = [
  {
    'id': 'taxonomy_1',
    'type': 'taxonomy',
    'from_name': 'taxonomy',
    'to_name': 'image',
    'value': {
      'taxonomy': [
        [
          'Choice 1',
        ],
      ],
    },
  },
];

export const perRegionTaxonomyResult = [
  {
    'id': 'rect_1',
    'type': 'rectangle',
    'from_name': 'rect',
    'to_name': 'image',
    'value': {
      'x': 0,
      'y': 0,
      'width': 50,
      'height': 100,
    },
  },
  {
    'id': 'rect_1',
    'type': 'taxonomy',
    'from_name': 'taxonomy',
    'to_name': 'image',
    'value': {
      'x': 0,
      'y': 0,
      'width': 50,
      'height': 100,
      'taxonomy': [
        ['Choice 2'],
      ],
    },
  },
  {
    'id': 'rect_2',
    'type': 'rectangle',
    'from_name': 'rect',
    'to_name': 'image',
    'value': {
      'x': 50,
      'y': 0,
      'width': 50,
      'height': 100,
    },
  },
];

export const perItemTaxonomyResult = [
  {
    'id': 'taxonomy_1',
    'type': 'taxonomy',
    'from_name': 'taxonomy',
    'to_name': 'image',
    'value': {
      'taxonomy': [
        [
          'Choice 1',
        ],
      ],
    },
    'item_index': 0,
  },
  {
    'id': 'taxonomy_2',
    'type': 'taxonomy',
    'from_name': 'taxonomy',
    'to_name': 'image',
    'value': {
      'taxonomy': [
        [
          'Choice 2',
        ],
      ],
    },
    'item_index': 1,
  },
  {
    'id': 'taxonomy_3',
    'type': 'taxonomy',
    'from_name': 'taxonomy',
    'to_name': 'image',
    'value': {
      'taxonomy': [
        [
          'Choice 3',
        ],
      ],
    },
    'item_index': 2,
  },
];

/* <Textarea /> */
export const perTagTextareaResult = [
  {
    'id': 'textarea_1',
    'type': 'textarea',
    'from_name': 'textarea',
    'to_name': 'image',
    'value': {
      'text': ['Text 1'],
    },
  },
];

export const perRegionTextareaResult = [
  {
    'id': 'rect_1',
    'type': 'rectangle',
    'from_name': 'rect',
    'to_name': 'image',
    'value': {
      'x': 0,
      'y': 0,
      'width': 50,
      'height': 100,
    },
  },
  {
    'id': 'rect_1',
    'type': 'textarea',
    'from_name': 'textarea',
    'to_name': 'image',
    'value': {
      'text': ['Text 1'],
      'x': 0,
      'y': 0,
      'width': 50,
      'height': 100,
    },
  },
  {
    'id': 'rect_2',
    'type': 'rectangle',
    'from_name': 'rect',
    'to_name': 'image',
    'value': {
      'x': 50,
      'y': 0,
      'width': 50,
      'height': 100,
    },
  },
];

export const perItemTextareaResult = [
  {
    'id': 'textarea_1',
    'type': 'textarea',
    'from_name': 'textarea',
    'to_name': 'image',
    'value': {
      'text': ['Text 1'],
    },
    'item_index': 0,
  },
  {
    'id': 'textarea_2',
    'type': 'textarea',
    'from_name': 'textarea',
    'to_name': 'image',
    'value': {
      'text': ['Text 2'],
    },
    'item_index': 1,
  },
  {
    'id': 'textarea_3',
    'type': 'textarea',
    'from_name': 'textarea',
    'to_name': 'image',
    'value': {
      'text': ['Text 3'],
    },
    'item_index': 2,
  },
];

export const DATETIME_REQUIRED_WARNING = 'DateTime "datetime" is required.';
export const CHOICES_REQUIRED_WARNING = 'Checkbox "choices" is required.';
export const NUMBER_REQUIRED_WARNING = 'Number "number" is required.';
export const RATING_REQUIRED_WARNING = 'Rating "rating" is required.';
export const TAXONOMY_REQUIRED_WARNING = 'Taxonomy "taxonomy" is required.';
export const TEXTAREA_REQUIRED_WARNING = 'Input for the textarea "textarea" is required.';
