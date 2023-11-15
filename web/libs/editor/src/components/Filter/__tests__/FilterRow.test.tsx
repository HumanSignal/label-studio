import React from 'react';
import { FilterRow } from '../FilterRow';
import { fireEvent, render, screen } from '@testing-library/react';

describe('FilterRow', () => {
  const mockOnChange = jest.fn();
  const mockOnDelete = jest.fn();


  test('should display "Where" when index is 0', () => {
    const filter = render(<FilterRow
      field=""
      operation=""
      value=""
      logic="and"
      availableFilters={[{
        label: 'Annotation results',
        path: 'labelName',
        type: 'String',
      },
      {
        label: 'Confidence score',
        path: 'score',
        type: 'Number',
      }]}
      index={0}
      onChange={mockOnChange}
      onDelete={mockOnDelete} />);

    const whereText = filter.getByText('Where');

    expect(whereText).toBeDefined();
  });

  test('should display select box when index is 1 or more', () => {
    const filter = render(<FilterRow
      field=""
      operation=""
      value=""
      logic="and"
      availableFilters={[{
        label: 'Annotation results',
        path: 'labelName',
        type: 'String',
      },
      {
        label: 'Confidence score',
        path: 'score',
        type: 'Number',
      }]}
      index={1}
      onChange={mockOnChange}
      onDelete={mockOnDelete} />);

    const selectBox = filter.getByTestId('logic-dropdown');

    expect(selectBox.textContent).toBe('And');

    fireEvent.click(screen.getByTestId('logic-dropdown'));
    fireEvent.click(screen.getByText('Or'));

    expect(selectBox.textContent).toBe('Or');
  });

  test('should display select box when index is 1 or more', () => {
    const filter = render(<FilterRow
      field=""
      operation=""
      value=""
      logic="and"
      availableFilters={[{
        label: 'Annotation results',
        path: 'labelName',
        type: 'String',
      },
      {
        label: 'Confidence score',
        path: 'score',
        type: 'Number',
      }]}
      index={1}
      onChange={mockOnChange}
      onDelete={mockOnDelete} />);

    const selectBox = filter.getByTestId('logic-dropdown');

    expect(selectBox.textContent).toBe('And');

    fireEvent.click(selectBox);
    fireEvent.click(screen.getByText('Or'));

    expect(selectBox.textContent).toBe('Or');
  });

  test('select and fill fields', () => {
    const filter = render(<FilterRow
      field=""
      operation=""
      value=""
      logic="and"
      availableFilters={[{
        label: 'Annotation results',
        path: 'labelName',
        type: 'String',
      },
      {
        label: 'Confidence score',
        path: 'score',
        type: 'Number',
      }]}
      index={1}
      onChange={mockOnChange}
      onDelete={mockOnDelete}/>);

    const fieldDropdown = filter.getByTestId('field-dropdown');
    const operationDropdown = filter.getByTestId('operation-dropdown');

    expect(fieldDropdown).toBeDefined();
    fireEvent.click(fieldDropdown);
    fireEvent.click(screen.getByText('Annotation results'));
    fireEvent.click(operationDropdown);
    fireEvent.click(screen.getByText('not contains'));

    const filterInput = filter.getByTestId('filter-input');

    expect(filterInput).toBeDefined();

    expect(fieldDropdown.textContent).toBe('Annotation results');
    expect(operationDropdown.textContent).toBe('not contains');
  });
});
