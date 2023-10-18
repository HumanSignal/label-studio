import { render, screen } from '@testing-library/react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Phrases } from '../Phrases';
import { getRoot } from 'mobx-state-tree';
import { mockFF } from '../../../../../__mocks__/global';
import { FF_LSDV_E_278 } from '../../../../utils/feature-flags';

const ff = mockFF();

const intersectionObserverMock = () => ({
  observe: () => null,
  disconnect: () => null,
});

window.IntersectionObserver = jest.fn().mockImplementation(intersectionObserverMock);

jest.mock('mobx-state-tree', () => ({
  ...jest.requireActual('mobx-state-tree'),
  getRoot: jest.fn(),
}));

describe('Phrases Component', () => {
  beforeAll(() => {
    ff.setup();
    ff.set({
      [FF_LSDV_E_278]: true,
    });
  });
  afterAll(() => {
    ff.reset();
  });

  it('renders phrases', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    getRoot.mockReturnValue({ settings: { showLineNumbers: false } });

    const item = {
      namekey: 'name',
      textKey: 'text',
      layoutClasses: {
        phrase: 'phrase-class',
        name: 'name-class',
        text: 'text-class',
      },
      audio: 'audio-file.mp3',
      _value: [
        { start: 0, name: 'phrase1', text: 'This is phrase 1' },
        { start: 1, name: 'phrase2', text: 'This is phrase 2' },
      ],
      isVisibleForAuthorFilter: jest.fn(() => true),
      layoutStyles: () => ({ phrase: { color: 'red' } }),
    };

    const playingId = 0;
    const contextScroll = false;

    render(
      <Phrases item={item} playingId={playingId} contextScroll={contextScroll} />,
    );

    const phraseElements = screen.getAllByTestId(/^phrase:/);
    const phraseTextContext = phraseElements.map(element => element.textContent);
  
    expect(phraseElements).toHaveLength(2);
    expect(phraseTextContext[0]).toContain('phrase1');
    expect(phraseTextContext[1]).toContain('phrase2');
  });
});

