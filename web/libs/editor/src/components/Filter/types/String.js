import { observer } from 'mobx-react';
import React from 'react';
import { FilterInput } from '../FilterInput';
import { Common } from './Common';

const BaseInput = observer(( props ) => {
  return (
    <FilterInput
      {...props}
      type='text'
      value={props.value}
      onChange={props.onChange}
      style={{ fontSize: 14 }}
      placeholder={props.placeholder}
    />
  );
});

export const StringFilter = [
  {
    key: 'contains',
    label: 'contains',
    valueType: 'single',
    input: BaseInput,
  },
  {
    key: 'not_contains',
    label: 'not contains',
    valueType: 'single',
    input: BaseInput,
  },
  {
    key: 'regex',
    label: 'regex',
    valueType: 'single',
    input: BaseInput,
  },
  {
    key: 'equal',
    label: 'equal',
    valueType: 'single',
    input: BaseInput,
  },
  {
    key: 'not_equal',
    label: 'not equal',
    valueType: 'single',
    input: BaseInput,
  },
  ...Common,
];
