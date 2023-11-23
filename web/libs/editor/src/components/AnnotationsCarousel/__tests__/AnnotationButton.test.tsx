/* global test, expect, jest, describe */
import Enzyme, { mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { AnnotationButton } from '../AnnotationButton';
// eslint-disable-next-line
// @ts-ignore
import { annotationStore } from './sampleData.js';

Enzyme.configure({ adapter: new Adapter() });

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useLayoutEffect: jest.requireActual('react').useEffect,
}));

describe('AnnotationsButton', () => {
  test('Annotation', () => {
    const entity = annotationStore.annotations[0];
    const view = mount(<AnnotationButton entity={entity} capabilities={{}} annotationStore={annotationStore} />);

    expect(view.find('.dm-annotation-button__entity-id').text()).toBe(`#${entity.pk}`);
  });
  test('Prediction', () => {
    const entity = annotationStore.predictions[0];
    const view = mount(<AnnotationButton entity={entity} capabilities={{}} annotationStore={annotationStore} />);
    
    expect(view.find('.dm-annotation-button__entity-id').text()).toBe(`#${entity.pk}`);
  });
});
