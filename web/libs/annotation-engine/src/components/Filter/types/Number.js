import { observer } from 'mobx-react';
import React from 'react';
import { FilterInput } from '../FilterInput';
import { Common } from './Common';

const NumberInput = observer(( props ) => {
  return (
    <FilterInput
      {...props}
      type='number'
      value={props.value}
      pattern={'[0-9*]'}
      onChange={props.onChange}
    />
  );
});

const RangeInput = observer(( props ) => {
  const min = props.value?.min ?? null;
  const max = props.value?.max ?? null;

  const onValueChange = (newValue) => {
    console.log({ newValue });
    props.onChange(newValue);
  };

  const onChangeMin = (newValue) => {
    onValueChange({ min: Number(newValue), max });
  };

  const onChangeMax = (newValue) => {
    onValueChange({ min, max: Number(newValue) });
  };

  return (
    <>
      <NumberInput
        placeholder='Min'
        value={min}
        onChange={onChangeMin}
        schema={props.schema}
        style={{ flex: 1 }}
      />
      <span style={{ padding: '0 10px' }}>and</span>
      <NumberInput
        placeholder='Max'
        value={max}
        onChange={onChangeMax}
        schema={props.schema}
        style={{ flex: 1 }}
      />
    </>
  );
});

export const NumberFilter = [
  {
    key: 'equal',
    label: '=',
    valueType: 'single',
    input: NumberInput,
  },
  {
    key: 'not_equal',
    label: '≠',
    valueType: 'single',
    input: NumberInput,
  },
  {
    key: 'less',
    label: '<',
    valueType: 'single',
    input: NumberInput,
  },
  {
    key: 'greater',
    label: '>',
    valueType: 'single',
    input: NumberInput,
  },
  {
    key: 'less_or_equal',
    label: '≤',
    valueType: 'single',
    input: NumberInput,
  },
  {
    key: 'greater_or_equal',
    label: '≥',
    valueType: 'single',
    input: NumberInput,
  },
  {
    key: 'in',
    label: 'is between',
    valueType: 'range',
    input: RangeInput,
  },
  {
    key: 'not_in',
    label: 'not between',
    valueType: 'range',
    input: RangeInput,
  },
  ...Common,
];
