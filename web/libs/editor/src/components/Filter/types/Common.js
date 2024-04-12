import { observer } from 'mobx-react';
import React from 'react';
import { FilterDropdown } from '../FilterDropdown';

const BaseInput = observer((props) => (
  <FilterDropdown onChange={(value) => props.onChange(value)} items={[{ label: 'yes' }, { label: 'no' }]} />
));

export const Common = [
  {
    key: 'empty',
    label: 'is empty',
    input: BaseInput,
  },
];
