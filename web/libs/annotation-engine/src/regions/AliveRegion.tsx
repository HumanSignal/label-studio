import { observer } from 'mobx-react';
import { isAlive } from 'mobx-state-tree';

import { IReactComponent } from 'mobx-react/dist/types/IReactComponent';

type Region = {
  hidden: boolean,
  // ...
}

type RegionComponentProps = {
  item: Region,
}

type Options = {
  renderHidden?: boolean,
}

export const AliveRegion = (
  RegionComponent: IReactComponent<RegionComponentProps>,
  options?: Options,
) => {
  const ObservableRegion = observer(RegionComponent);

  return observer(({ item, ...rest }: RegionComponentProps) => {
    const canRender = options?.renderHidden || !item.hidden;

    return isAlive(item) && canRender ? <ObservableRegion item={item} {...rest} /> : null;
  });
};
