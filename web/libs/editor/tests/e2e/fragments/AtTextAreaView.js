/* global inject */
const { I } = inject();

module.exports = {
  _inputSelector: '.ant-form-horizontal .ant-form-item .ant-form-item-control .ant-form-item-control-input .ant-form-item-control-input-content input',

  addNewTextTag(value) {
    I.fillField(this._inputSelector, value);
    I.pressKeyDown('Enter');
  },
};
