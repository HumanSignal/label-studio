Feature('Wrong ordered results deserialization').tag('@regress');

Scenario('Combining results of per-region  textarea and richtext regions.', async ({ I, LabelStudio, AtSidebar }) => {
  I.amOnPage('/');

  LabelStudio.init({
    annotations: [
      {
        id: 'test', result: [

          {
            id: 'id_1',
            from_name: 'comment',
            to_name: 'text',
            type: 'textarea',
            value: {
              start: 0,
              end: 11,
              text: ['That\'s true'],
            },
          },
          {
            id: 'id_1',
            from_name: 'labels',
            to_name: 'text',
            type: 'labels',
            value: {
              start: 0,
              end: 11,
              labels: ['Label 1'],
              text: 'Just a text',
            },
          },
        ],
      }],
    config: `
<View>
  <Labels name="labels" toname="text">
    <Label value="Label 1"/>
  </Labels>
  <Text name="text" value="$text"  />
  <Textarea name="comment" toname="text" perregion="true"/>
</View>`,
    data: { text: 'Just a text' },
  });

  AtSidebar.seeRegions(1);
});
