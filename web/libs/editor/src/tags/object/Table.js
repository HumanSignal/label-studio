import React from 'react';
import { Table } from 'antd';
import { inject, observer } from 'mobx-react';
import { flow, getEnv, types } from 'mobx-state-tree';
import Papa from 'papaparse';

import { errorBuilder } from '../../core/DataValidator/ConfigValidator';
import Registry from '../../core/Registry';
import { AnnotationMixin } from '../../mixins/AnnotationMixin';
import ProcessAttrsMixin from '../../mixins/ProcessAttrs';
import Base from './Base';
import { parseTypeAndOption, parseValue } from '../../utils/data';

/**
 * The `Table` tag is used to display object keys and values in a table.
 * @example
 * <!-- Basic labeling configuration for text in a table -->
 * <View>
 *   <Table name="text-1" value="$text"></Table>
 * </View>
 * @name Table
 * @meta_title Table Tag to Display Keys & Values in Tables
 * @meta_description Customize Label Studio by displaying key-value pairs in tasks for machine learning and data science projects.
 * @param {string} value Data field value containing JSON type for Table
 * @param {string} [valueType] Value to define the data type in Table
 */
const Model = types
  .model({
    type: 'table',
    value: types.maybeNull(types.string),
    _value: types.frozen([]),
    valuetype: types.optional(types.string, 'json'),
  })
  .views(self => ({
    get dataSource() {
      const { type } = parseTypeAndOption(self.valuetype);

      if (type === 'json') {
        return Object.keys(self._value).sort((a, b) => {
          return a.toLowerCase().localeCompare(b.toLowerCase());
        }).map(k => {
          let val = self._value[k];

          if (typeof val === 'object') val = JSON.stringify(val);
          return { type: k, value: val };
        });
      } else {
        return self._value;
      }
    },
    get columns() {
      if (self.valuetype === 'json' || !self._value[0]) {
        return [
          { title: 'Name', dataIndex: 'type' },
          { title: 'Value', dataIndex: 'value' },
        ];
      } else {
        return Object.keys(self._value[0]).map(value => ({ title: value, dataIndex: value }));
      }
    },
  }))
  .actions(self => ({
    updateValue: flow(function*(store) {
      const { type, options } = parseTypeAndOption(self.valuetype);
      let originData = parseValue(self.value, store.task.dataObj);

      if (options.url) {
        try {
          const response = yield fetch(originData);
          const { ok, status, statusText } = response;

          if (!ok) throw new Error(`${status} ${statusText}`);

          originData = yield response.text();
        } catch (error) {
          const message = getEnv(self).messages.ERR_LOADING_HTTP({ attr: self.value, error: String(error), url: originData });

          self.annotationStore.addErrors([errorBuilder.generalError(message)]);
        }
      }

      switch (type) {
        case 'csv':
          {
            Papa.parse(originData, {
              delimiter: options.separator,
              header: !options.headless,
              download: false,
              complete: ({ data }) => {
                self._value = data;
              },
            });
          }
          break;
        default:
          self._value = typeof originData === 'string' ? JSON.parse(originData) : originData;
          break;
      }
    }),
  }));

const TableModel = types.compose('TableModel', Base, ProcessAttrsMixin, AnnotationMixin, Model);

const HtxTable = inject('store')(
  observer(({ item }) => {
    return <Table bordered dataSource={item.dataSource} columns={item.columns} pagination={{ hideOnSinglePage: true }} />;
  }),
);

Registry.addTag('table', TableModel, HtxTable);
Registry.addObjectType(TableModel);

export { HtxTable, TableModel };
