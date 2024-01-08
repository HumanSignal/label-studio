Feature('Table');

const config = `
<View>
    <Header value="Table with {key: value} pairs"/>
    <Table name="table" value="$text"/>
    <Choices name="choice" toName="table">
        <Choice value="Correct"/>
        <Choice value="Incorrect"/>
    </Choices>
</View>
`;

const data = {
  text: {
    cTest: 2,
    aaTest: 1,
    bbbTest: 3,
    ATest: 4,
  },
};

const params = { annotations: [{ id: 'test', result: [] }], config, data };

Scenario('Check if the table is sorted', async function({ I, LabelStudio, AtTableView }) {
  const _sortedArr = ['aaTest', 'ATest', 'bbbTest', 'cTest'];

  I.amOnPage('/');

  LabelStudio.init(params);

  await AtTableView.seeKeys(_sortedArr);
});
