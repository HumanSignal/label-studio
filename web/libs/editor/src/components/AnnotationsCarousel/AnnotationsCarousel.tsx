import { Block, Elem } from '../../utils/bem';
import { LsChevron } from '../../assets/icons';
import { Button } from '../../common/Button/Button';
import './AnnotationsCarousel.styl';
import { AnnotationButton } from './AnnotationButton';
import { useCallback, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react';
import { clamp } from '../../utils/utilities';

interface AnnotationsCarouselInterface {
  store: any;
  annotationStore: any; 
  commentStore?: any;
}

export const AnnotationsCarousel = observer(({ store, annotationStore }: AnnotationsCarouselInterface) => {
  const [entities, setEntities] = useState<any[]>([]);
  const enableAnnotations = store.hasInterface('annotations:tabs');
  const enablePredictions = store.hasInterface('predictions:tabs');
  const enableCreateAnnotation = store.hasInterface('annotations:add-new');
  const groundTruthEnabled = store.hasInterface('ground-truth');
  const enableAnnotationDelete = store.hasInterface('annotations:delete');
  const carouselRef = useRef<HTMLElement>();
  const containerRef = useRef<HTMLElement>();
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isLeftDisabled, setIsLeftDisabled] = useState(false);
  const [isRightDisabled, setIsRightDisabled] = useState(false);

  const updatePosition = useCallback((e: MouseEvent, goLeft = true) => {
    if (containerRef.current && carouselRef.current) {
      const step = containerRef.current.clientWidth;
      const carouselWidth = carouselRef.current.clientWidth;
      const newPos = clamp(goLeft ? currentPosition - step : currentPosition + step, 0, carouselWidth - step);

      setCurrentPosition(newPos);
    }
  }, [containerRef, carouselRef, currentPosition]);
  
  useEffect(() => {
    setIsLeftDisabled(currentPosition <= 0);
    setIsRightDisabled(currentPosition >= ((carouselRef.current?.clientWidth ?? 0) - (containerRef.current?.clientWidth ?? 0)));
  }, [entities.length, containerRef.current, carouselRef.current, currentPosition, window.innerWidth, window.innerHeight]);

  useEffect(() => {
    const newEntities = [];

    if (enablePredictions) newEntities.push(...annotationStore.predictions);
  
    if (enableAnnotations) newEntities.push(...annotationStore.annotations);
    setEntities(newEntities);
  }, [annotationStore, JSON.stringify(annotationStore.predictions), JSON.stringify(annotationStore.annotations)]);
  
  return (enableAnnotations || enablePredictions || enableCreateAnnotation) ? (
    <Block name='annotations-carousel' style={{ '--carousel-left': `${currentPosition}px` }}>
      <Elem ref={containerRef} name='container'>
        <Elem ref={carouselRef} name='carosel'>
          {entities.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()).map(entity => (
            <AnnotationButton 
              key={entity?.id} 
              entity={entity} 
              capabilities={{
                enablePredictions,
                enableCreateAnnotation,
                groundTruthEnabled,
                enableAnnotations,
                enableAnnotationDelete,
              }}
              annotationStore={annotationStore}
            />
          ))}
        </Elem>
      </Elem>
      {(!isLeftDisabled || !isRightDisabled) && (
        <Elem name='carousel-controls'>
          <Elem tag={Button} name='nav' disabled={isLeftDisabled} mod={{ left: true, disabled: isLeftDisabled }} aria-label="Carousel left" onClick={(e: MouseEvent) => !isLeftDisabled && updatePosition(e, true)}>
            <Elem name='arrow' mod={{ left: true }} tag={LsChevron} />
          </Elem>
          <Elem tag={Button} name='nav' disabled={isRightDisabled} mod={{ right: true, disabled: isRightDisabled }} aria-label="Carousel right" onClick={(e: MouseEvent) => !isRightDisabled && updatePosition(e, false)}>
            <Elem name='arrow' mod={{ right: true }} tag={LsChevron} />
          </Elem>
        </Elem>
      )}
    </Block>
  ) : null;
});
