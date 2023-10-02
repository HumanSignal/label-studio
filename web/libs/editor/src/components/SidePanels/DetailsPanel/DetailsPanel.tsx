import { inject, observer } from 'mobx-react';
import { FC } from 'react';
import { Block, Elem } from '../../../utils/bem';
import { FF_DEV_2290, isFF } from '../../../utils/feature-flags';
import { Comments as CommentsComponent } from '../../Comments/Comments';
import { AnnotationHistory } from '../../CurrentEntity/AnnotationHistory';
import { PanelBase, PanelProps } from '../PanelBase';
import './DetailsPanel.styl';
import { RegionDetailsMain, RegionDetailsMeta } from './RegionDetails';
import { RegionItem } from './RegionItem';
import { Relations as RelationsComponent } from './Relations';
// eslint-disable-next-line
// @ts-ignore
import { DraftPanel } from '../../DraftPanel/DraftPanel';
interface DetailsPanelProps extends PanelProps {
  regions: any;
  selection: any;
}

const DetailsPanelComponent: FC<DetailsPanelProps> = ({ currentEntity, regions, ...props }) => {
  const selectedRegions = regions.selection;

  return (
    <PanelBase {...props} currentEntity={currentEntity} name="details" title="Details">
      <Content selection={selectedRegions} currentEntity={currentEntity} />
    </PanelBase>
  );
};

const DetailsComponent: FC<DetailsPanelProps> = ({ currentEntity, regions }) => {
  const selectedRegions = regions.selection;

  return (
    <Block name="details-tab">
      <Content selection={selectedRegions} currentEntity={currentEntity} />
    </Block>
  );
};


const Content: FC<any> = observer(({
  selection,
  currentEntity,
}) => {
  return (
    <>
      {(selection.size) ? (
        <RegionsPanel regions={selection}/>
      ) : (
        <GeneralPanel currentEntity={currentEntity}/>
      )}
    </>
  );
});


const CommentsTab: FC<any> = inject('store')(observer(({ store }) => {
  return (
    <>
      {store.hasInterface('annotations:comments') && store.commentStore.isCommentable && (
        <Block name="comments-panel">
          <Elem name="section-tab">
            <Elem name="section-content">
              <CommentsComponent commentStore={store.commentStore} cacheKey={`task.${store.task.id}`} />
            </Elem>
          </Elem>
        </Block>
      )}
    </>
  );
}));

const RelationsTab: FC<any> = inject('store')(observer(({ currentEntity }) => {
  const { relationStore } = currentEntity;

  return (
    <>
      <Block name="relations">
        <Elem name="section-tab">
          <Elem name="section-head">Relations ({relationStore.size})</Elem>
          <Elem name="section-content">
            <RelationsComponent relationStore={relationStore} />
          </Elem>
        </Elem>
      </Block>
    </>
  );
}));

const HistoryTab: FC<any> = inject('store')(observer(({ store, currentEntity }) => {
  const showAnnotationHistory = store.hasInterface('annotations:history');
  const showDraftInHistory = isFF(FF_DEV_2290);

  return (
    <>
      <Block name="history">
        {!showDraftInHistory ? (
          <DraftPanel item={currentEntity} />
        ) : (
          <Elem name="section-tab">
            <Elem name="section-head">
              Annotation History
              <span>#{currentEntity.pk ?? currentEntity.id}</span>
            </Elem>
            <Elem name="section-content">
              <AnnotationHistory inline showDraft={showDraftInHistory} enabled={showAnnotationHistory} />
            </Elem>
          </Elem>
        )}
      </Block>
    </>
  );
}));


const InfoTab: FC<any> = inject('store')(
  observer(({ selection }) => {
    return (
      <>
        <Block name="info">
          <Elem name="section-tab">
            <Elem name="section-head">Selection Details</Elem>
            <RegionsPanel regions={selection}/>
          </Elem>
        </Block>
      </>
    );
  }),
);

const GeneralPanel: FC<any> = inject('store')(observer(({ store, currentEntity }) => {
  const { relationStore } = currentEntity;
  const showAnnotationHistory = store.hasInterface('annotations:history');
  const showDraftInHistory = isFF(FF_DEV_2290);

  return (
    <>
      {!showDraftInHistory ? (
        <DraftPanel item={currentEntity} />
      ) : (
        <Elem name="section">
          <Elem name="section-head">
              Annotation History
            <span>#{currentEntity.pk ?? currentEntity.id}</span>
          </Elem>
          <Elem name="section-content">
            <AnnotationHistory
              inline
              showDraft={showDraftInHistory}
              enabled={showAnnotationHistory}
            />
          </Elem>
        </Elem>
      )}
      <Elem name="section">
        <Elem name="section-head">
          Relations ({relationStore.size})
        </Elem>
        <Elem name="section-content">
          <RelationsComponent
            relationStore={relationStore}
          />
        </Elem>
      </Elem>
      {store.hasInterface('annotations:comments') && store.commentStore.isCommentable && (
        <Elem name="section">
          <Elem name="section-head">
            Comments
          </Elem>
          <Elem name="section-content">
            <CommentsComponent
              commentStore={store.commentStore}
              cacheKey={`task.${store.task.id}`}
            />
          </Elem>
        </Elem>
      )}
    </>
  );
}));

GeneralPanel.displayName = 'GeneralPanel';

const RegionsPanel: FC<{regions:  any}> = observer(({
  regions,
}) => {
  return (
    <div>
      {regions.list.map((reg: any) => {
        return (
          <SelectedRegion key={reg.id} region={reg}/>
        );
      })}
    </div>
  );
});

const SelectedRegion: FC<{region: any}> = observer(({
  region,
}) => {
  return (
    <RegionItem
      region={region}
      mainDetails={RegionDetailsMain}
      metaDetails={RegionDetailsMeta}
    />
  );
});

export const Comments = observer(CommentsTab);
export const History = observer(HistoryTab);
export const Relations = observer(RelationsTab);
export const Info = observer(InfoTab);
export const Details = observer(DetailsComponent);
export const DetailsPanel = observer(DetailsPanelComponent);
