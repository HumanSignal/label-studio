/* global test, expect, jest */
import React from 'react';
import Enzyme, { mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { AnnotationsCarousel } from '../AnnotationsCarousel';
// eslint-disable-next-line
// @ts-ignore
import { annotationStore, store } from './sampleData.js';

Enzyme.configure({ adapter: new Adapter() });

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useLayoutEffect: jest.requireActual('react').useEffect,
}));

test('AnnotationsCarousel', async () => {
  const view = mount(<AnnotationsCarousel annotationStore={annotationStore} store={store} />);
  
  expect(view.find('.dm-annotations-carousel__carosel').children().length).toBe(9);
});
