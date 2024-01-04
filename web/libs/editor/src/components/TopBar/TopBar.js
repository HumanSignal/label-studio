import { observer } from 'mobx-react';
import { Block, Elem } from '../../utils/bem';
import { DynamicPreannotationsToggle } from '../AnnotationTab/DynamicPreannotationsToggle';
import { Actions } from './Actions';
import { Annotations } from './Annotations';
import { Controls } from './Controls';
import { CurrentTask } from './CurrentTask';
import { FF_DEV_3873, isFF } from '../../utils/feature-flags';
import { Button } from '../../common/Button/Button';
import { Tooltip } from '../../common/Tooltip/Tooltip';
import { IconViewAll, LsPlus } from '../../assets/icons';
import { AnnotationsCarousel } from '../AnnotationsCarousel/AnnotationsCarousel';
import './TopBar.styl';

export const TopBar = observer(({ store }) => {
  const annotationStore = store.annotationStore;
  const entity = annotationStore?.selected;
  const isPrediction = entity?.type === 'prediction';

  const isViewAll = annotationStore?.viewingAll === true;

  return store ? (
    <Block name="topbar" mod={{ newLabelingUI: isFF(FF_DEV_3873) }}>
      {isFF(FF_DEV_3873) ? (
        <Elem name="group">
          <CurrentTask store={store}/>
          {store.hasInterface('annotations:view-all') && (
            <Tooltip title="View all annotations">
              <Button
                className={'topbar__button'}
                icon={<IconViewAll />}
                type="text"
                aria-label="View All"
                onClick={() => annotationStore.toggleViewingAllAnnotations()}
                primary={ isViewAll }
                style={{
                  height: 36,
                  width: 36,
                  padding: 0,
                  marginRight: isFF(FF_DEV_3873) && 8,
                }}
              />
            </Tooltip>
          )}
          {store.hasInterface('annotations:add-new') && (
            <Tooltip placement="topLeft" title="Create a new annotation">
              <Button
                icon={<LsPlus />}
                className={'topbar__button'}
                type="text"
                aria-label="View All"
                onClick={event => {
                  event.preventDefault();
                  const created = store.annotationStore.createAnnotation();

                  store.annotationStore.selectAnnotation(created.id);
                }}
                style={{
                  height: 36,
                  width: 36,
                  padding: 0,
                  marginRight: 4,
                }}
              />
  
            </Tooltip>
          )}
          {!isViewAll && (
            <AnnotationsCarousel
              store={store}
              annotationStore={store.annotationStore}
              commentStore={store.commentStore}
            />
          )}
        </Elem>
      ) : (
        <>
          <Elem name="group">
            <CurrentTask store={store}/>
            {!isViewAll && (
              <Annotations
                store={store}
                annotationStore={store.annotationStore}
                commentStore={store.commentStore}
              />
            )}
            <Actions store={store}/>
          </Elem>
          <Elem name="group">
            {!isViewAll && (
    
              <Elem name="section">
                <DynamicPreannotationsToggle />
              </Elem>
            )}
            {!isViewAll && store.hasInterface('controls') && (store.hasInterface('review') || !isPrediction) && (
              <Elem name="section" mod={{ flat: true }} style={{ width: 320, boxSizing: 'border-box' }}>
                <Controls annotation={entity} />
              </Elem>
            )}
          </Elem>
        </>
      )}
    </Block>
  ) : null;
});
