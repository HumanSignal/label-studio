import { isAlive, types } from 'mobx-state-tree';
import { Object3DEntity } from './Object3DEntity';

export const Object3DEntityMixin = types
  .model({
    currentObject3DEntity: types.maybeNull(types.reference(Object3DEntity)),

    object3dEntities: types.optional(types.array(Object3DEntity), []),
  })
  .actions(self => {
    return {
      beforeDestroy() {
        self.currentObject3DEntity = null;
      },
    };
  })
  .views(self => ({
    get maxItemIndex() {
      return self.object3dEntities.length - 1;
    },

    get object3dIsLoaded() {
      const object3dEntity = self.currentObject3DEntity;

      return (
        !object3dEntity.downloading &&
        !object3dEntity.error &&
        object3dEntity.downloaded &&
        object3dEntity.object3dLoaded
      );
    },
    get rotation() {
      if (!isAlive(self)) {
        return void 0;
      }
      return self.currentObject3DEntity?.rotation;
    },
    set rotation(value) {
      self.currentObject3DEntity?.setRotation(value);
    },

    get naturalWidth() {
      return self.currentObject3DEntity?.naturalWidth;
    },
    set naturalWidth(value) {
      self.currentObject3DEntity?.setNaturalWidth(value);
    },

    get naturalHeight() {
      return self.currentObject3DEntity?.naturalHeight;
    },
    set naturalHeight(value) {
      self.currentObject3DEntity?.setNaturalHeight(value);
    },

    get stageWidth() {
      return self.currentObject3DEntity?.stageWidth;
    },
    set stageWidth(value) {
      self.currentObject3DEntity?.setStageWidth(value);
    },

    get stageHeight() {
      return self.currentObject3DEntity?.stageHeight;
    },
    set stageHeight(value) {
      self.currentObject3DEntity?.setStageHeight(value);
    },

    get stageRatio() {
      return self.currentObject3DEntity?.stageRatio;
    },
    set stageRatio(value) {
      self.currentObject3DEntity?.setStageRatio(value);
    },

    get containerWidth() {
      return self.currentObject3DEntity?.containerWidth;
    },
    set containerWidth(value) {
      self.currentObject3DEntity?.setContainerWidth(value);
    },

    get containerHeight() {
      return self.currentObject3DEntity?.containerHeight;
    },
    set containerHeight(value) {
      self.currentObject3DEntity?.setContainerHeight(value);
    },

    get stageZoom() {
      return self.currentObject3DEntity?.stageZoom;
    },
    set stageZoom(value) {
      self.currentObject3DEntity?.setStageZoom(value);
    },

    get stageZoomX() {
      return self.currentObject3DEntity?.stageZoomX;
    },
    set stageZoomX(value) {
      self.currentObject3DEntity?.setStageZoomX(value);
    },

    get stageZoomY() {
      return self.currentObject3DEntity?.stageZoomY;
    },
    set stageZoomY(value) {
      self.currentObject3DEntity?.setStageZoomY(value);
    },

    get currentZoom() {
      return self.currentObject3DEntity?.currentZoom;
    },
    set currentZoom(value) {
      self.currentObject3DEntity?.setCurrentZoom(value);
    },

    get zoomScale() {
      if (!isAlive(self)) {
        return void 0;
      }
      return self.currentObject3DEntity?.zoomScale;
    },
    set zoomScale(value) {
      self.currentObject3DEntity?.setZoomScale(value);
    },

    get zoomingPositionX() {
      if (!isAlive(self)) {
        return void 0;
      }
      return self.currentObject3DEntity?.zoomingPositionX;
    },
    set zoomingPositionX(value) {
      self.currentObject3DEntity?.setZoomingPositionX(value);
    },

    get zoomingPositionY() {
      if (!isAlive(self)) {
        return null;
      }
      return self.currentObject3DEntity?.zoomingPositionY;
    },
    set zoomingPositionY(value) {
      self.currentObject3DEntity?.setZoomingPositionY(value);
    },

    get brightnessGrade() {
      return self.currentObject3DEntity?.brightnessGrade;
    },
    set brightnessGrade(value) {
      self.currentObject3DEntity?.setBrightnessGrade(value);
    },

    get contrastGrade() {
      return self.currentObject3DEntity?.contrastGrade;
    },
    set contrastGrade(value) {
      self.currentObject3DEntity?.setContrastGrade(value);
    },

    findObject3DEntity(index) {
      index = index ?? 0;
      return self.object3dEntities.find(entity => entity.index === index);
    },
  }));
