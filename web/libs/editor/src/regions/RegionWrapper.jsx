import { observer } from 'mobx-react';
import { Fragment, useContext } from 'react';
import { ImageViewContext } from '../components/ImageView/ImageViewContext';
import { SuggestionControls } from '../components/ImageView/SuggestionControls';

export const RegionWrapper = observer(({ item, children }) => {
  const { suggestion } = useContext(ImageViewContext) ?? {};

  return (
    <Fragment>
      {children}
      {suggestion && (
        <SuggestionControls item={item} useLayer={item.type === 'brushregion'}/>
      )}
    </Fragment>
  );
});
