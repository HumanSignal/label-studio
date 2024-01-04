import { types } from 'mobx-state-tree';
import { mockFF } from '../../../../../__mocks__/global';
import { FF_LSDV_E_278 } from '../../../../utils/feature-flags';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { ParagraphsModel } from '../model';

const ff = mockFF();

jest.mock('../../../../regions/ParagraphsRegion', () => ({}));


const MockStore = types
  .model({
    paragraphs: ParagraphsModel,
  })
  .volatile(() => ({
    task: { dataObj: {} },
    annotationStore: { addErrors: jest.fn() },
  }));

const phrases = [
  {
    author: 'Cheshire Cat',
    text: 'You must be, or you wouldn\'t have come here.',
    start: 6,
  },
  {
    author: 'Cheshire Cat',
    text: 'We\'re all mad here. I\'m mad. You\'re mad.',
    start: 1.2,
    end: 4.1, // overlapping with the next phrase
  },
  {
    // just a phrase with no timing
    author: 'Lewis Carroll',
    text: '<cat is smiling>',
  },
  {
    author: 'Alice',
    text: 'How do you know I\'m mad?',
    start: 3.2,
    duration: 1.5,
  },
];

ff.setup();
ff.set({
  [FF_LSDV_E_278]: true,
});

describe('Paragraphs phrases', () => {
  // creating models can be a long one, so all tests will share one model
  const model = ParagraphsModel.create({ name: 'phrases', value: '$phrases', contextscroll: true });
  const store = MockStore.create({ paragraphs: model });
  const duration = 10;

  store.task.dataObj = { phrases };
  model.updateValue(store);
  model.handleAudioLoaded({ target: { duration } });

  it('should update value from task', () => {
    expect(model._value).toEqual(phrases);
  });

  it('should calculate phrases times', () => {
    const expected = [
      {
        start: 1.2,
        end: 4.1,
      },
      {
        start: 3.2,
        end: 4.7,
      },
      {
        start: 6,
        end: duration,
      },
      {},
    ];

    expect(model.regionsStartEnd).toEqual(expected);
  });

  it('should detect phrase id by time', () => {
    expect(model.regionIndicesByTime(1)).toEqual([]);
    expect(model.regionIndicesByTime(2)).toEqual([0]);
    expect(model.regionIndicesByTime(3)).toEqual([0]);
    expect(model.regionIndicesByTime(4)).toEqual([0, 1]);
    expect(model.regionIndicesByTime(5)).toEqual([]);
    expect(model.regionIndicesByTime(6)).toEqual([2]);
    expect(model.regionIndicesByTime(7)).toEqual([2]);
  });

  it('should order the phrases by start time', () => {
    expect(model._value.map((p: { author: string }) => p.author)).toEqual([
      phrases[0].author,
      phrases[1].author,
      phrases[2].author,
      phrases[3].author,
    ]);
  });
  ff.reset();
});
