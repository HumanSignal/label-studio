import { inject, observer } from 'mobx-react';
import Input from '../../common/Input/Input';
import { Block } from '../../utils/bem';
import './DynamicPreannotationsControl.styl';

export const DynamicPreannotationsControl = inject('store')(observer(({ store }) => {
  return store.autoAnnotation && !store.forceAutoAcceptSuggestions ? (
    <Block name="dynamic-preannotations-control">
      <Input
        type="checkbox"
        checked={store.autoAcceptSuggestions}
        label="Auto accept annotation suggestions"
        onChange={(e) => store.setAutoAcceptSuggestions(e.target.checked)}
        waiting={store.awaitingSuggestions}
        labelProps={{
          placement: 'right',
        }}
      />
    </Block>
  ) : null;
}));
