import { inject, observer } from 'mobx-react';
import { Space } from '../../common/Space/Space';
import Toggle from '../../common/Toggle/Toggle';
import { Block, Elem } from '../../utils/bem';
import './DynamicPreannotationsToggle.styl';

const injector = inject(({ store }) => {
  const regionStore = store.settings.annotation.regionStore;
  return {
    store,
    regionStore,
    interfaces: Array.from(store?.interfaces),
  };
});

export const RegionBoxesToggle = injector(observer(({
                                                                store,
                                                                regionStore,
                                                              }) => {
  const enabled = store.settings.enableRegionBoxes;

  return enabled ? (
    <Block name="region-boxes">
      <Elem name="wrapper">
        <Space spread>
          <Toggle
            checked={regionStore.showRegionBoundingBoxes}
            onChange={(e) => {
              const checked = e.target.checked;

              regionStore.setRegionBoundingBoxes(checked);
            }}
            label="Region-Bounding-Boxes"
            style={{ color: '#FF6060' }}
          />
          <Toggle
            checked={regionStore.showRegionHitBoxes}
            onChange={(e) => {
              const checked = e.target.checked;

              regionStore.setRegionHitBoxes(checked);
            }}
            label="Region-Hit-Boxes"
            style={{ color: '#609960' }}
          />
        </Space>
      </Elem>
    </Block>
  ) : null;
}));
