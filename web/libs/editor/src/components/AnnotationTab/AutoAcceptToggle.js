import { inject, observer } from 'mobx-react';

import { Block, Elem } from '../../utils/bem';
import { Button } from '../../common/Button/Button';
import { IconCheck, IconCross } from '../../assets/icons';
import { Space } from '../../common/Space/Space';
import Toggle from '../../common/Toggle/Toggle';

import './AutoAcceptToggle.styl';

const injector = inject(({ store }) => {
  const annotation = store.annotationStore?.selected;
  const suggestions = annotation?.suggestions;

  return {
    store,
    annotation,
    suggestions,
    interfaces: Array.from(store?.interfaces),
  };
});

export const AutoAcceptToggle = injector(observer(({
  store,
  annotation,
  suggestions,
}) => {
  return store.autoAnnotation && !store.forceAutoAcceptSuggestions ? (
    <Block name="auto-accept">
      <Elem name="wrapper">
        <Space spread>
          <Toggle
            checked={store.autoAcceptSuggestions}
            onChange={(e) => {
              const checked = e.target.checked;

              store.setAutoAcceptSuggestions(checked);
            }}
            label="Auto-Accept Suggestions"
            style={{ color: '#7F64FF' }}
          />
          {suggestions.size > 0 && (
            <Space size="small">
              <Elem name="action" tag={Button} mod={{ type: 'reject' }} onClick={() => annotation.rejectAllSuggestions()}>
                <IconCross/>
              </Elem>
              <Elem name="action" tag={Button} mod={{ type: 'accept' }} onClick={() => annotation.acceptAllSuggestions()}>
                <IconCheck/>
              </Elem>
            </Space>
          )}
        </Space>
      </Elem>
    </Block>
  ) : null;
}));
