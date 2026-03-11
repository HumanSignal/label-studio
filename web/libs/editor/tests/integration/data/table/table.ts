export const objectTableConfig = `
<View>
  <Header value="Table with {key: value} pairs"/>
  <Table name="table" value="$text"/>
  <Choices name="choice" toName="table">
    <Choice value="Correct"/>
    <Choice value="Incorrect"/>
  </Choices>
</View>
`;

export const objectTableData = {
  text: {
    cTest: 2,
    aaTest: 1,
    bbbTest: 3,
    ATest: 4,
  },
};

export const listObjectTableConfig = `
<View>
  <Header value="Table from list of objects"/>
  <Table name="table" value="$rows"/>
  <Choices name="choice" toName="table">
    <Choice value="Correct"/>
    <Choice value="Incorrect"/>
  </Choices>
</View>
`;

export const listObjectTableData = {
  rows: [
    { a: 1, b: 2 },
    { a: 3, b: 4, c: 5 },
  ],
};

export const listPrimitiveTableConfig = `
<View>
  <Header value="Table from list of primitives"/>
  <Table name="table" value="$items"/>
  <Choices name="choice" toName="table">
    <Choice value="Correct"/>
    <Choice value="Incorrect"/>
  </Choices>
</View>
`;

export const listPrimitiveTableData = {
  items: ["alpha", 123, { nested: true }],
};
