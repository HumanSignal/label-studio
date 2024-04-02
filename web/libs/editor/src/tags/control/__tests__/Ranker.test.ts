import { types } from 'mobx-state-tree';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { ListModel } from '../../object/List';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { RankerModel } from '../Ranker';

declare global {
  interface Window { STORE_INIT_OK?: boolean }
}

// @todo we don't have a real init process here;
// @todo so this is temporary fix to overpass the check in AnnotationMixin
beforeEach(() => {
  window.STORE_INIT_OK = true;
});
afterEach(() => {
  window.STORE_INIT_OK = undefined;
});

const MockAnnotationStore = types.model('Annotation', {
  names: types.map(types.union(RankerModel, ListModel)),
}).volatile(() => ({
  results: [] as any[],
}));

const MockStore = types
  .model({
    annotationStore: types.model({
      selected: MockAnnotationStore,
    }),
  })
  .volatile(() => ({
    task: { dataObj: {} },
  }));

const items = [
  { 'id': 'item1', 'title': '111' },
  { 'id': 'item2', 'title': '222' },
  { 'id': 'item3', 'title': '333' },
];

describe('List + Ranker (rank mode)', () => {
  const list = ListModel.create({ name: 'list', value: '$items', title: 'Test List' });
  const ranker = RankerModel.create({ name: 'rank', toname: 'list' });
  const store = MockStore.create({ annotationStore: { selected: { names: { list, ranker } } } });

  store.task.dataObj = { items };
  list.updateValue(store);

  it('List and Ranker should get values from the task', () => {
    expect(list._value).toEqual(items);
    expect(Object.keys(ranker.list.items)).toEqual(['item1', 'item2', 'item3']);
  });

  it('Ranker should have proper columns and other getters', () => {
    expect(ranker.buckets).toEqual([]);
    expect(ranker.defaultBucket).toEqual('rank');
    expect(ranker.rankOnly).toEqual(true);
    expect(ranker.columns).toEqual([{ id: 'rank', title: 'Test List' }]);
  });
});

describe('List + Ranker + Buckets (pick mode)', () => {
  const list = ListModel.create({ name: 'list', value: '$items', title: 'Test List' });
  const ranker = RankerModel.create({ name: 'rank', toname: 'list', children: [
    { id: 'B1', type: 'bucket', name: 'B1', title: 'Bucket 1' },
    { id: 'B2', type: 'bucket', name: 'B2', title: 'Bucket 2' },
  ] });
  const store = MockStore.create({ annotationStore: { selected: { names: { list, ranker } } } });

  store.task.dataObj = { items };
  list.updateValue(store);

  const columns = [
    { id: '_', title: 'Test List' },
    { id: 'B1', title: 'Bucket 1' },
    { id: 'B2', title: 'Bucket 2' },
  ];
  const result: any = {
    from_name: ranker,
    to_name: list,
    type: 'ranker',
    value: { ranker: { B1: ['item2'] } },
  };

  it('List and Ranker should get values from the task', () => {
    expect(list._value).toEqual(items);
    expect(Object.keys(ranker.list.items)).toEqual(['item1', 'item2', 'item3']);
  });

  it('Ranker should have proper columns and other getters', () => {
    expect(ranker.buckets.map((b: any) => b.name)).toEqual(['B1', 'B2']);
    expect(ranker.defaultBucket).toEqual(undefined);
    expect(ranker.rankOnly).toEqual(false);
    expect(ranker.columns).toEqual(columns);
  });

  it('Ranker puts all items into _ bucket if there is no result', () => {
    expect(ranker.dataSource).toEqual({
      items: ranker.list.items,
      columns,
      itemIds: { _: ['item1', 'item2', 'item3'], B1: [], B2: [] },
    });
  });

  it('Ranker returns items according to result and puts the rest to _ bucket', () => {
    store.annotationStore.selected.results.push(result);

    expect(ranker.result).toBeTruthy();
    expect(ranker.dataSource).toEqual({
      items: ranker.list.items,
      columns,
      itemIds: { B1: ['item2'], B2: [], _: ['item1', 'item3'] },
    });
  });
});

describe('List + Ranker + Buckets + default (group mode)', () => {
  const list = ListModel.create({ name: 'list', value: '$items', title: 'Test List' });
  const ranker = RankerModel.create({ name: 'rank', toname: 'list', children: [
    { id: 'B1', type: 'bucket', name: 'B1', title: 'Bucket 1' },
    { id: 'B2', type: 'bucket', name: 'B2', title: 'Bucket 2', default: true },
  ] });
  const store = MockStore.create({ annotationStore: { selected: { names: { list, ranker } } } });

  store.task.dataObj = { items };
  list.updateValue(store);

  const columns = [
    { id: 'B1', title: 'Bucket 1' },
    { id: 'B2', title: 'Bucket 2' },
  ];
  const result: any = {
    from_name: ranker,
    to_name: list,
    type: 'ranker',
    value: { ranker: { B1: ['item2'], B2: ['item1', 'item3'] } },
  };

  it('List and Ranker should get values from the task', () => {
    expect(list._value).toEqual(items);
    expect(Object.keys(ranker.list.items)).toEqual(['item1', 'item2', 'item3']);
  });

  it('Ranker should have proper columns and other getters', () => {
    expect(ranker.buckets.map((b: any) => b.name)).toEqual(['B1', 'B2']);
    expect(ranker.defaultBucket).toEqual('B2');
    expect(ranker.rankOnly).toEqual(false);
    expect(ranker.columns).toEqual(columns);
  });

  it('Ranker puts all items into default bucket if there is no result', () => {
    expect(ranker.dataSource).toEqual({
      items: ranker.list.items,
      columns,
      itemIds: { B1: [], B2: ['item1', 'item2', 'item3'] },
    });
  });

  it('Ranker returns items according to result', () => {
    store.annotationStore.selected.results.push(result);

    expect(ranker.result).toBeTruthy();
    expect(ranker.dataSource).toEqual({
      items: ranker.list.items,
      columns,
      itemIds: { B1: ['item2'], B2: ['item1', 'item3'] },
    });
  });
});
