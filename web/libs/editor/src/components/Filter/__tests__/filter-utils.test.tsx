import { FilterItemsByOperation } from '../filter-util';

describe('FilterItems', () => {
  const items = [
    {
      item: {
        name: 'Car', value: 25,
      },
    },{
      item: {
        name: 'AirPlane', value: 30,
      },
    },{
      item: {
        name: 'Car Flower', value: 40,
      },
    },
  ];

  test('should filter items that contain the specified value', () => {
    const filterItem = { operation: 'contains', path: 'item.name', value: 'Car' };
    const filteredItems = FilterItemsByOperation(items, filterItem);

    expect(filteredItems).toEqual([
      {
        item: {
          name: 'Car', value: 25,
        },
      },{
        item: {
          name: 'Car Flower', value: 40,
        },
      },
    ]);
  });

  test('should filter items that do not contain the specified value', () => {
    const filterItem = { operation: 'not_contains', path: 'item.name', value: 'Car' };
    const filteredItems = FilterItemsByOperation(items, filterItem);

    expect(filteredItems).toEqual([
      {
        item: {
          name: 'AirPlane', value: 30,
        },
      },
    ]);
  });

  test('should filter items that value is between the specified values', () => {
    const filterItem = { operation: 'in', path: 'item.value', value: { min: 26, max: 35 } };
    const filteredItems = FilterItemsByOperation(items, filterItem);

    expect(filteredItems).toEqual([{
      item: {
        name: 'AirPlane', value: 30,
      },
    }]);
  });

  test('should filter items that value is not between the specified values', () => {
    const filterItem = { operation: 'not_in', path: 'item.value', value: { min: 26, max: 35 } };
    const filteredItems = FilterItemsByOperation(items, filterItem);

    expect(filteredItems).toEqual([{
      item: {
        name: 'Car', value: 25,
      },
    },{
      item: {
        name: 'Car Flower', value: 40,
      },
    }]);
  });

  test('should filter items that value match with regex specified value', () => {
    const filterItem = { operation: 'regex', path: 'item.name', value: '[C-O]' };
    const filteredItems = FilterItemsByOperation(items, filterItem);

    expect(filteredItems).toEqual([{
      item: {
        name: 'Car', value: 25,
      },
    }, {
      item: {
        name: 'Car Flower', value: 40,
      },
    }]);
  });

  test('should filter items that value is empty', () => {
    const filterItem = { operation: 'empty', path: 'item.name', value: '' };
    const filteredItems = FilterItemsByOperation([{
      item: {
        name: 'Car', value: 25,
      },
    },{
      item: {
        name: '', value: 30,
      },
    },{
      item: {
        name: null, value: 40,
      },
    }], filterItem);

    console.log(filteredItems);

    expect(filteredItems).toEqual([{
      item: {
        name: '', value: 30,
      },
    },{
      item: {
        name: null, value: 40,
      },
    }]);
  });

  test('should return all items when value is empty', () => {
    const filterItem = { operation: 'contains', path: 'item.name', value: '' };
    const filteredItems = FilterItemsByOperation(items, filterItem);

    expect(filteredItems).toEqual(items);
  });

  test('should filter items that have a greater value than the specified value ', () => {
    const filterItem = { operation: 'greater', path: 'item.value', value: '25' };
    const filteredItems = FilterItemsByOperation(items, filterItem);

    expect(filteredItems).toEqual([{
      item: {
        name: 'AirPlane', value: 30,
      },
    },{
      item: {
        name: 'Car Flower', value: 40,
      },
    }]);
  });

  test('should filter items that have a less value than the specified value ', () => {
    const filterItem = { operation: 'less', path: 'item.value', value: '40' };
    const filteredItems = FilterItemsByOperation(items, filterItem);

    expect(filteredItems).toEqual([{
      item: {
        name: 'Car', value: 25,
      },
    },{
      item: {
        name: 'AirPlane', value: 30,
      },
    }]);
  });

  test('should filter items that have a less or equal value than the specified value ', () => {
    const filterItem = { operation: 'less_or_equal', path: 'item.value', value: '30' };
    const filteredItems = FilterItemsByOperation(items, filterItem);

    expect(filteredItems).toEqual([{
      item: {
        name: 'Car', value: 25,
      },
    },{
      item: {
        name: 'AirPlane', value: 30,
      },
    }]);
  });

  test('should filter items that have a greater or equal value than the specified value ', () => {
    const filterItem = { operation: 'greater_or_equal', path: 'item.value', value: '30' };
    const filteredItems = FilterItemsByOperation(items, filterItem);

    expect(filteredItems).toEqual([{
      item: {
        name: 'AirPlane', value: 30,
      },
    },{
      item: {
        name: 'Car Flower', value: 40,
      },
    }]);
  });

  test('should return all items when operation is invalid', () => {
    const filterItem = { operation: 'invalid_operation', path: 'item.name', value: 'Doe' };
    const filteredItems = FilterItemsByOperation(items, filterItem);

    expect(filteredItems).toEqual(items);
  });

  test('should filter items that is equal as the specified value', () => {
    const filterItem = { operation: 'equal', path: 'item.value', value: '25' };
    const filteredItems = FilterItemsByOperation(items, filterItem);

    expect(filteredItems).toEqual([
      {
        item: {
          name: 'Car', value: 25,
        },
      },
    ]);
  });

  test('should filter items that is not equal as the specified value', () => {
    const filterItem = { operation: 'not_equal', path: 'item.value', value: '25' };
    const filteredItems = FilterItemsByOperation(items, filterItem);

    expect(filteredItems).toEqual([
      {
        item: {
          name: 'AirPlane', value: 30,
        },
      },{
        item: {
          name: 'Car Flower', value: 40,
        },
      },
    ]);
  });
});
