/**
 * Unit tests for ImageEntityMixin (tags/object/Image/ImageEntityMixin.js)
 */
import { types } from "mobx-state-tree";
import { ImageEntityMixin } from "../ImageEntityMixin";
import { ImageEntity } from "../ImageEntity";

const ModelWithMixin = types.compose(ImageEntityMixin).actions((self) => ({
  setCurrentEntity(entity) {
    self.currentImageEntity = entity;
  },
}));

const RootWithChild = types
  .model({
    child: types.maybe(ModelWithMixin),
  })
  .actions((self) => ({
    clearChild() {
      self.child = undefined;
    },
  }));

function createStore(snapshot = {}) {
  const defaultSnapshot = {
    imageEntities: [
      { id: "img-1", src: "https://example.com/1.jpg", index: 0 },
      { id: "img-2", src: "https://example.com/2.jpg", index: 1 },
    ],
    currentImageEntity: null,
    ...snapshot,
  };
  return ModelWithMixin.create(defaultSnapshot);
}

function createRootWithChild() {
  return RootWithChild.create({
    child: {
      imageEntities: [{ id: "img-1", src: "https://example.com/1.jpg", index: 0 }],
      currentImageEntity: null,
    },
  });
}

describe("ImageEntityMixin", () => {
  describe("maxItemIndex", () => {
    it("returns imageEntities.length - 1", () => {
      const store = createStore();
      expect(store.maxItemIndex).toBe(1);
    });

    it("returns -1 when imageEntities is empty", () => {
      const store = createStore({ imageEntities: [] });
      expect(store.maxItemIndex).toBe(-1);
    });
  });

  describe("imageIsLoaded", () => {
    it("returns true when entity is loaded and not downloading or error", () => {
      const store = createStore();
      store.setCurrentEntity(store.imageEntities[0]);
      store.currentImageEntity.setDownloaded(true);
      store.currentImageEntity.setImageLoaded(true);
      expect(store.imageIsLoaded).toBe(true);
    });

    it("returns false when entity is still downloading", () => {
      const store = createStore();
      store.setCurrentEntity(store.imageEntities[0]);
      store.currentImageEntity.setDownloading(true);
      expect(store.imageIsLoaded).toBe(false);
    });

    it("returns false when entity has error", () => {
      const store = createStore();
      store.setCurrentEntity(store.imageEntities[0]);
      store.currentImageEntity.setError(true);
      expect(store.imageIsLoaded).toBe(false);
    });

    it("returns false when not downloaded", () => {
      const store = createStore();
      store.setCurrentEntity(store.imageEntities[0]);
      expect(store.imageIsLoaded).toBe(false);
    });

    it("returns false when image not loaded", () => {
      const store = createStore();
      store.setCurrentEntity(store.imageEntities[0]);
      store.currentImageEntity.setDownloaded(true);
      store.currentImageEntity.setImageLoaded(false);
      expect(store.imageIsLoaded).toBe(false);
    });
  });

  describe("rotation", () => {
    it("returns currentImageEntity rotation and allows set", () => {
      const store = createStore();
      store.setCurrentEntity(store.imageEntities[0]);
      expect(store.rotation).toBe(0);
      store.rotation = 90;
      expect(store.rotation).toBe(90);
    });

    it("returns undefined when currentImageEntity is null", () => {
      const store = createStore();
      expect(store.rotation).toBeUndefined();
    });
  });

  describe("naturalWidth / naturalHeight", () => {
    it("delegates get and set to currentImageEntity", () => {
      const store = createStore();
      store.setCurrentEntity(store.imageEntities[0]);
      expect(store.naturalWidth).toBe(1);
      expect(store.naturalHeight).toBe(1);
      store.naturalWidth = 800;
      store.naturalHeight = 600;
      expect(store.naturalWidth).toBe(800);
      expect(store.naturalHeight).toBe(600);
    });
  });

  describe("stage dimensions and ratio", () => {
    it("delegates stageWidth, stageHeight, stageRatio to currentImageEntity", () => {
      const store = createStore();
      store.setCurrentEntity(store.imageEntities[0]);
      store.stageWidth = 400;
      store.stageHeight = 300;
      store.stageRatio = 1.5;
      expect(store.stageWidth).toBe(400);
      expect(store.stageHeight).toBe(300);
      expect(store.stageRatio).toBe(1.5);
    });
  });

  describe("container dimensions", () => {
    it("delegates containerWidth and containerHeight to currentImageEntity", () => {
      const store = createStore();
      store.setCurrentEntity(store.imageEntities[0]);
      store.containerWidth = 800;
      store.containerHeight = 600;
      expect(store.containerWidth).toBe(800);
      expect(store.containerHeight).toBe(600);
    });
  });

  describe("zoom", () => {
    it("delegates stageZoom, stageZoomX, stageZoomY, currentZoom to currentImageEntity", () => {
      const store = createStore();
      store.setCurrentEntity(store.imageEntities[0]);
      store.stageZoom = 2;
      store.stageZoomX = 1.5;
      store.stageZoomY = 1.5;
      store.currentZoom = 2;
      expect(store.stageZoom).toBe(2);
      expect(store.stageZoomX).toBe(1.5);
      expect(store.stageZoomY).toBe(1.5);
      expect(store.currentZoom).toBe(2);
    });

    it("delegates zoomScale and zoomingPosition to currentImageEntity", () => {
      const store = createStore();
      store.setCurrentEntity(store.imageEntities[0]);
      store.zoomScale = 1.5;
      store.zoomingPositionX = 10;
      store.zoomingPositionY = 20;
      expect(store.zoomScale).toBe(1.5);
      expect(store.zoomingPositionX).toBe(10);
      expect(store.zoomingPositionY).toBe(20);
    });
  });

  describe("brightness and contrast", () => {
    it("delegates brightnessGrade and contrastGrade to currentImageEntity", () => {
      const store = createStore();
      store.setCurrentEntity(store.imageEntities[0]);
      store.brightnessGrade = 120;
      store.contrastGrade = 110;
      expect(store.brightnessGrade).toBe(120);
      expect(store.contrastGrade).toBe(110);
    });
  });

  describe("findImageEntity", () => {
    it("finds entity by index", () => {
      const store = createStore();
      expect(store.findImageEntity(0)).toBe(store.imageEntities[0]);
      expect(store.findImageEntity(1)).toBe(store.imageEntities[1]);
    });

    it("returns undefined for missing index", () => {
      const store = createStore();
      expect(store.findImageEntity(99)).toBeUndefined();
    });

    it("treats null/undefined index as 0", () => {
      const store = createStore();
      expect(store.findImageEntity(null)).toBe(store.imageEntities[0]);
      expect(store.findImageEntity(undefined)).toBe(store.imageEntities[0]);
    });
  });

  describe("beforeDestroy", () => {
    it("clears currentImageEntity when called", () => {
      const store = createStore();
      store.setCurrentEntity(store.imageEntities[0]);
      expect(store.currentImageEntity).not.toBeNull();
      store.beforeDestroy();
      expect(store.currentImageEntity).toBeNull();
    });
  });

  describe("when node is not alive (detached)", () => {
    it("rotation, zoomScale, zoomingPositionX return undefined and zoomingPositionY returns null", () => {
      const root = createRootWithChild();
      root.child.setCurrentEntity(root.child.imageEntities[0]);
      const detached = root.child;
      root.clearChild();
      expect(detached.rotation).toBeUndefined();
      expect(detached.zoomScale).toBeUndefined();
      expect(detached.zoomingPositionX).toBeUndefined();
      expect(detached.zoomingPositionY).toBeNull();
    });
  });
});
