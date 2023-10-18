

const { initLabelStudio } = require('./helpers');

Feature('Repeater paginate and scroll');

const data = {
  images: [
    {
      url: 'https://htx-pub.s3.amazonaws.com/demo/images/demo_stock_purchase_agreement/0001.jpg',
    },
    {
      url: 'https://htx-pub.s3.amazonaws.com/demo/images/demo_stock_purchase_agreement/0002.jpg',
    },
    {
      url: 'https://htx-pub.s3.amazonaws.com/demo/images/demo_stock_purchase_agreement/0003.jpg',
    },
  ],
};

const configPagination = `
  <View>
    <Repeater on="$images" indexFlag="{{idx}}" mode="pagination" >
      <Image name="page_{{idx}}" value="$images[{{idx}}].url"/>
      <RectangleLabels name="labels_{{idx}}" toName="page_{{idx}}">
        <Label value="Document Title" />
        <Label value="Document Date" />
        <Label value="Document Author" background="yellow"/>
      </RectangleLabels>
    </Repeater>
  </View>
`;

const configScroll = `
  <View>
    <Repeater on="$images" indexFlag="{{idx}}" >
      <Image name="page_{{idx}}" value="$images[{{idx}}].url"/>
      <RectangleLabels name="labels_{{idx}}" toName="page_{{idx}}">
        <Label value="Document Title" />
        <Label value="Document Date" />
        <Label value="Document Author" background="yellow"/>
      </RectangleLabels>
    </Repeater>
  </View>
`;


const annotations = [
  {
    id: 38,
    result: [
      {
        id: 'Eg3_P8-ZRu',
        type: 'rectanglelabels',
        value: {
          x: 8.247422680412368,
          y: 54.22647527910686,
          width: 75.46391752577318,
          height: 9.090909090909092,
          rotation: 0,
          rectanglelabels: ['Document Date'],
        },
        page: 1,
        origin: 'manual',
        to_name: 'page_0',
        from_name: 'labels_0',
        image_rotation: 0,
        original_width: 800,
        original_height: 1035,
      },
      {
        id: 'yd33DCnE52',
        type: 'rectanglelabels',
        value: {
          x: 22.379603399433428,
          y: 70.31044654069684,
          width: 20.396600566572232,
          height: 22.560672877544462,
          rotation: 0,
          rectanglelabels: ['Document Title'],
        },
        page: 3,
        origin: 'manual',
        to_name: 'page_2',
        from_name: 'labels_2',
        image_rotation: 0,
        original_width: 600,
        original_height: 776,
      },
      {
        id: '7qxBZWOXXG',
        type: 'rectanglelabels',
        value: {
          x: 33.711048158640224,
          y: 60.01577056744838,
          width: 23.229461756373937,
          height: 7.447212406179728,
          rotation: 0,
          rectanglelabels: ['Document Author'],
        },
        page: 2,
        origin: 'manual',
        to_name: 'page_1',
        from_name: 'labels_1',
        image_rotation: 0,
        original_width: 600,
        original_height: 776,
      },
    ],
  },
];

const checkScrollToSelectedPersists = (I, label, outliner) => {
  I.click(locate(`.lsf-${outliner ? 'outliner' : 'region'}-item__title`).withText(label));
  I.waitForVisible(locate('.lsf-label_selected').withText(label));
};

const checkPaginateToSelectedPersists = (I, label, page, outliner) => {
  checkScrollToSelectedPersists(I, label, outliner);
  I.seeElement(locate('.lsf-pagination__page-indicator').withText(`${page}`));
};

const checkPaginationButtons = (I) => {
  I.click(locate('.lsf-pagination__btn_arrow-left-double'));
  I.seeElement(locate('.lsf-pagination__page-indicator').withText('1'));

  I.click(locate('.lsf-pagination__btn_arrow-right'));
  I.seeElement(locate('.lsf-pagination__page-indicator').withText('2'));

  I.click(locate('.lsf-pagination__btn_arrow-right'));
  I.seeElement(locate('.lsf-pagination__page-indicator').withText('3'));
};

const checkSubmit = (I) => {
  I.click('[aria-label="Annotations List Toggle"]');
  I.click('[aria-label="Create Annotation"]');
  I.submitAnnotation();
  I.seeAnnotationSubmitted();
};

Scenario('Outliner Regions will paginate view window on region click and page advance', async function({ I, LabelStudio }) {
  const params = { config: configPagination, annotations, data };

  I.amOnPage('/');
  LabelStudio.setFeatureFlags({
    ff_front_1170_outliner_030222_short: true,
  });
  I.executeScript(initLabelStudio, params);

  annotations[0].result.forEach(result => {
    const label = result.value?.rectanglelabels[0];

    checkPaginateToSelectedPersists(I, label, result.page, true);
  });

  checkPaginationButtons(I);
  checkSubmit(I);

});

Scenario('Regions will paginate view window on region click and page advance', async function({ I, LabelStudio }) {
  const params = { config: configPagination, annotations, data };

  I.amOnPage('/');
  LabelStudio.setFeatureFlags({
    ff_front_1170_outliner_030222_short: false,
  });
  I.executeScript(initLabelStudio, params);

  annotations[0].result.forEach(result => {
    const label = result.value?.rectanglelabels[0];

    checkPaginateToSelectedPersists(I, label, result.page, false);
  });

  checkPaginationButtons(I);
  checkSubmit(I);

});

Scenario('Outliner Regions will scroll view window on region click', async function({ I, LabelStudio }) {
  const params = { config: configScroll, annotations, data };

  I.amOnPage('/');
  LabelStudio.setFeatureFlags({
    ff_front_1170_outliner_030222_short: true,
  });
  I.executeScript(initLabelStudio, params);

  annotations[0].result.forEach(result => {
    const label = result.value?.rectanglelabels[0];

    checkScrollToSelectedPersists(I, label, true);
  });
  checkSubmit(I);

});

Scenario('Regions will scroll view window on region click', async function({ I, LabelStudio }) {
  const params = { config: configScroll, annotations, data };

  I.amOnPage('/');
  LabelStudio.setFeatureFlags({
    ff_front_1170_outliner_030222_short: false,
  });
  I.executeScript(initLabelStudio, params);

  annotations[0].result.forEach(result => {
    const label = result.value?.rectanglelabels[0];

    checkScrollToSelectedPersists(I, label, false);
  });
  checkSubmit(I);

});

