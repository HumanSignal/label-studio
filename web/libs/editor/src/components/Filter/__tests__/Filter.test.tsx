import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Filter } from '../Filter';

describe('Filter', () => {
  const mockOnChange = jest.fn();
  const filterData = [
    {
      'labelName': 'AirPlane',
    },
    {
      'labelName': 'Car',
    },
    {
      'labelName': 'AirCar',
    },
  ];

  test('Validate if filter is rendering', () => {
    const filter = render(<Filter
      onChange={mockOnChange}
      filterData={filterData}
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
    />);

    const whereText = filter.getByText('Filter');

    expect(whereText).toBeDefined();
  });

  test('Should delete row when delete button is clicked', () => {
    const filter = render(<Filter
      onChange={mockOnChange}
      filterData={filterData}
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
    />);

    const FilterButton = filter.getByText('Filter');

    fireEvent.click(FilterButton);

    const AddButton = filter.getByText('Add Filter');

    fireEvent.click(AddButton);
    fireEvent.click(AddButton);

    const selectBox = filter.getByTestId('logic-dropdown');

    expect(selectBox.textContent).toBe('And');

    fireEvent.click(selectBox);
    fireEvent.click(screen.getByText('Or'));

    expect(selectBox.textContent).toBe('Or');

    fireEvent.click(screen.getByTestId('delete-row-1'));

    expect(filter.getAllByTestId('filter-row')).toHaveLength(1);
  });

  test('Should filter the content', () => {
    let filteredContent: any;

    const filter = render(<Filter
      onChange={value => {
        filteredContent = value;
      }}
      filterData={filterData}
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
    />);

    const FilterButton = filter.getByText('Filter');

    fireEvent.click(FilterButton);

    expect(screen.getByText('No filters applied')).toBeDefined();

    const AddButton = filter.getByText('Add Filter');

    fireEvent.click(AddButton);

    const fieldDropdown = filter.getByTestId('field-dropdown');
    const operationDropdown = filter.getByTestId('operation-dropdown');

    fireEvent.click(operationDropdown);
    fireEvent.click(screen.getByText('not contains'));

    const filterInput = filter.getByTestId('filter-input');

    expect(filterInput).toBeDefined();

    expect(fieldDropdown.textContent).toBe('Annotation results');
    expect(operationDropdown.textContent).toBe('not contains');

    fireEvent.change(filterInput, { target: { value: 'Plane' } });


    expect(filteredContent).toStrictEqual([{ labelName: 'Car' }, { labelName: 'AirCar' }]) ;
  });

  test('Should hide dropdown filter', async () => {
    const filter = render(<Filter
      onChange={mockOnChange}
      filterData={filterData}
      animated={false}
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
    />);

    const FilterButton = await filter.getByText('Filter');

    fireEvent.click(FilterButton);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const dropdown = await filter.getByTestId('dropdown');

    expect(dropdown.classList.contains('dm-visible')).toBe(true);

    const AddButton = await filter.getByText('Add Filter');

    fireEvent.click(AddButton);

    fireEvent.click(FilterButton);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(dropdown.classList.contains('dm-before-appear')).toBe(false);
    expect(dropdown.classList.contains('dm-visible')).toBe(false);
    expect(dropdown.classList.contains('dm-before-disappear')).toBe(false);
  });

  test('Should show filter length badge', () => {
    const filter = render(<Filter
      onChange={mockOnChange}
      filterData={filterData}
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
    />);

    const FilterButton = filter.getByText('Filter');

    fireEvent.click(FilterButton);

    expect(screen.getByText('No filters applied')).toBeDefined();

    const AddButton = filter.getByText('Add Filter');

    fireEvent.click(AddButton);
    fireEvent.click(AddButton);

    const filterLength = filter.getByTestId('filter-length');

    expect(filterLength.textContent).toBe('2');
  });

  test('Filter button should be selected', () => {
    const filter = render(<Filter
      onChange={mockOnChange}
      filterData={filterData}
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
    />);

    const FilterButton = filter.getByTestId('filter-button');

    fireEvent.click(FilterButton);

    expect(FilterButton.classList.contains('dm-filter-button_active')).toBe(true);
  });
});