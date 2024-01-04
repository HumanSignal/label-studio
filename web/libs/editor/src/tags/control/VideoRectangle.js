import { observer } from 'mobx-react';
import { types } from 'mobx-state-tree';

import Registry from '../../core/Registry';
import { guidGenerator } from '../../core/Helpers';
import ControlBase from './Base';

/**
 * VideoRectangle tag brings Object Tracking capabilities to videos. It works in combination with the `<Video/>` and the `<Labels/>` tags.
 *
 * Use with the following data types: video
 * @example
 * <!--Video Object Tracking-->
 * <View>
 *   <Header>Label the video:</Header>
 *   <Video name="video" value="$video" />
 *   <VideoRectangle name="box" toName="video" />
 *
 *   <Labels name="videoLabels" toName="video">
 *     <Label value="Cell" background="#944BFF"/>
 *     <Label value="Bacteria" background="#98C84E"/>
 *   </Labels>
 * </View>
 * @name VideoRectangle
 * @meta_title Video Tag for Video Labeling
 * @meta_description Customize Label Studio with the Video tag for basic video annotation tasks for machine learning and data science projects.
 * @param {string} name Name of the element
 * @param {string} toName Name of the element to control (video)
 */
const TagAttrs = types.model({
  toname: types.maybeNull(types.string),
});

const ModelAttrs = types
  .model('VideoRectangleModel', {
    pid: types.optional(types.string, guidGenerator),
    type: 'videorectangle',
  });

const VideoRectangleModel = types.compose(
  'VideoRectangleModel',
  ControlBase,
  ModelAttrs,
  TagAttrs,
);

const HtxVideoRectangle = observer(() => {
  return null;
});

Registry.addTag('videorectangle', VideoRectangleModel, HtxVideoRectangle);

export { HtxVideoRectangle, VideoRectangleModel };
