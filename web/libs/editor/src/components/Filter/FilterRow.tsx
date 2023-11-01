import { FC, useEffect, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as FilterInputs from './types';

import { Block, Elem } from '../../utils/bem';
import { FilterDropdown } from './FilterDropdown';

import './FilterRow.styl';
import { FilterListInterface, Logic } from './FilterInterfaces';
import { isDefined } from '../../utils/utilities';
import { IconDelete } from '../../assets/icons';

interface FilterRowInterface extends FilterListInterface {
  availableFilters: any;
  index: number;
  onChange: (index: number, obj: any) => void;
  onDelete: (index: number) => void;
}

const logicItems = Object.entries(Logic).map(([key, label]) => ({ key, label }));

export const FilterRow: FC<FilterRowInterface> = ({
  field,
  operation,
  value,
  logic,
  availableFilters,
  index,
  onChange,
  onDelete,
}) => {
  const [_selectedField, setSelectedField] = useState(0);
  const [_selectedOperation, setSelectedOperation] = useState(-1);
  const [_inputComponent, setInputComponent] = useState(null);

  useEffect(() => {
    onChange(index, { field:availableFilters[_selectedField].label, path: availableFilters[_selectedField].path });
  }, [_selectedField]);

  useEffect(() => {
    const _operationItems = FilterInputs?.[availableFilters[_selectedField].type];
    const _operation = _operationItems.findIndex((item:any) => (item.key ?? item.label) === _selectedOperation);

    if(!isDefined(_operation) || _operation < 0) return;
    const _filterInputs = FilterInputs?.[availableFilters[_selectedField].type][_operation];

    onChange(index, { operation: _filterInputs?.key });
    setInputComponent(_filterInputs?.input);
  }, [_selectedOperation, _selectedField]);

  return (
    <Block name={'filter-row'} data-testid={'filter-row'}>
      <Elem name={'column'}>
        {index === 0 ? <Elem name={'title-row'}>Where</Elem>: (
          <FilterDropdown
            value={logic}
            items={logicItems}
            dataTestid={'logic-dropdown'}
            style={{ width: '60px' }}
            onChange={(value: any) => {
              onChange(index, { logic:value });
            }}
          />
        )}
      </Elem>
      <Elem name={'column'}>
        <FilterDropdown
          value={field}
          items={availableFilters}
          dataTestid={'field-dropdown'}
          style={{ width: '140px' }}
          onChange={(value: any) => {
            setSelectedField(availableFilters.findIndex((item:any) => (item.key ?? item.label) === value));

            onChange(index, { value:null });
          }}
        />
      </Elem>
      <Elem name={'column'}>
        <FilterDropdown
          value={operation}
          items={FilterInputs?.[availableFilters[_selectedField].type]}
          dataTestid={'operation-dropdown'}
          style={{ width: '110px' }}
          onChange={(value: any) => {
            setSelectedOperation(value);
          }}
        />
      </Elem>
      <Elem name={'column'}>
        {(_inputComponent && operation !== 'empty') && (
          <Elem
            tag={_inputComponent}
            value={value}
            onChange={(value: any) => {
              onChange(index, { value });
            }}
          />
        )}
      </Elem>
      <Elem name={'column'}>
        <Elem
          onClick={() => {
            onDelete(index);
          }}
          data-testid={`delete-row-${index}`}
          name={'delete'}>
          <IconDelete />
        </Elem>
      </Elem>
    </Block>
  );
};
