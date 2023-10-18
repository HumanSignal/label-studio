import { observer } from 'mobx-react';
import { isAlive } from 'mobx-state-tree';

import { IReactComponent } from 'mobx-react/dist/types/IReactComponent';
import { ExoticComponent, Fragment, ReactNode, useCallback } from 'react';
import { Portal } from 'react-konva-utils';
import { FF_DBLCLICK_DELAY, isFF } from '../utils/feature-flags';

type Region = {
  annotation: any,
  hidden: boolean,
  // ...
  setShapeRef(ref: any): void,
  inSelection: boolean,
}

type RegionComponentProps = {
  item: Region,
  setShapeRef: (ref: any) => void,
}

type Options = {
  renderHidden?: boolean,
  shouldNotUsePortal?: boolean,
}

type PortalProps = {
  selector?: string,
  enabled?: boolean,
  children: ReactNode,
};

export const AliveRegion = (
  RegionComponent: IReactComponent<RegionComponentProps>,
  options?: Options,
) => {
  const ObservableRegion = observer(RegionComponent);

  return observer(({ item, ...rest }: RegionComponentProps) => {
    const canRender = options?.renderHidden || !item.hidden;
    const shouldNotUsePortal = !isFF(FF_DBLCLICK_DELAY) || options?.shouldNotUsePortal;
    const Wrapper = (shouldNotUsePortal ? Fragment : Portal) as ExoticComponent<PortalProps>;
    const wrapperProps = shouldNotUsePortal ? {} : { selector: '.selection-regions-layer', enabled: item.inSelection };
    const isInTree = !!item.annotation;
    const setShapeRef = useCallback((ref) => {
      if (isAlive(item)) {
        item.setShapeRef(ref);
      }
    }, [item]);

    return isInTree && isAlive(item) && canRender ? (
      <Wrapper {...wrapperProps}>
        <ObservableRegion item={item} {...rest} setShapeRef={setShapeRef} />
      </Wrapper>
    ): null;
  });
};
