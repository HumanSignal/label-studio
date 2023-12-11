import { getRoot, types } from 'mobx-state-tree';
import { FF_DEV_3391, FF_SNAP_TO_PIXEL, isFF } from '../../utils/feature-flags';
import { BaseTag } from '../TagBase';
import { SNAP_TO_PIXEL_MODE } from '../../components/ImageView/Image';

const ControlBase = types.model({
  ...(isFF(FF_DEV_3391)
    ? {
      id: types.identifier,
      name: types.string,
    } : {
      name: types.identifier,
    }),
  smart: true,
  smartonly: false,
  isControlTag: true,
}).volatile(() => ({
  snapMode: SNAP_TO_PIXEL_MODE.EDGE,
})).views(self => ({
  // historically two "types" were used and we should keep that backward compatibility:
  // 1. name of control tag for describing labeled region;
  // 2. label type to attach corresponding value to this region.
  // usually they are the same, but with some problems:
  // a. for hypertextlabels label type should be "htmllabels";
  // original type are overwritten by Tree#buildData with real tag name,
  // so _type was introduced to contain desired result type;
  // b. but for textarea they differ from each other: "textarea" and "text".
  // so now there is simple way to distinguish and overwrite them via two methods:
  get resultType() {
    return self.type;
  },

  // and
  get valueType() {
    return self.type;
  },

  get toNameTag() {
    return self.annotation.names.get(self.toname);
  },

  selectedValues() {
    throw new Error('Control tag needs to implement selectedValues method in views');
  },

  get result() {
    return self.annotation.results.find(r => r.from_name === self);
  },

  getSnappedPoint(point) {
    if (!isFF(FF_SNAP_TO_PIXEL)) return point;

    if (self.snap === 'pixel') {
      return self.toNameTag.snapPointToPixel(point, self.snapMode);
    }
    return point;
  },
  get smartEnabled() {
    const smart = self.smart ?? false;
    const autoAnnotation = getRoot(self)?.autoAnnotation ?? false;

    // @todo: Not sure why smartonly ignores autoAnnotation; It was like this from the beginning
    return (autoAnnotation && smart) || self.smartonly || false;
  },
}));

export default types.compose(ControlBase, BaseTag);
