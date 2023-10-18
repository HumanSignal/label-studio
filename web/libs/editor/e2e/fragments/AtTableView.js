const { I } = inject();
const assert = require('assert');


module.exports = {
  _tableRowSelectors: [
    '.ant-table-wrapper .ant-table-tbody .ant-table-row:nth-child(1) .ant-table-cell:nth-child(1)',
    '.ant-table-wrapper .ant-table-tbody .ant-table-row:nth-child(2) .ant-table-cell:nth-child(1)',
    '.ant-table-wrapper .ant-table-tbody .ant-table-row:nth-child(3) .ant-table-cell:nth-child(1)',
  ],

  async seeKeys(value) {
    for (let i = 0; i < this._tableRowSelectors.length; i++) {
      const error = await I.grabTextFrom(this._tableRowSelectors[i]);

      assert.equal(error, value[i]);
    }
  },
};
