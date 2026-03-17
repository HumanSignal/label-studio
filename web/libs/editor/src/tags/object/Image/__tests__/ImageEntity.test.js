/**
 * Unit tests for ImageEntity (tags/object/Image/ImageEntity.js)
 */
import { types } from "mobx-state-tree";
import { ImageEntity } from "../ImageEntity";
import { ImageEntityMixin } from "../ImageEntityMixin";
import { imageCache } from "@humansignal/core";

jest.mock("@humansignal/core", () => ({
  imageCache: {
    get: jest.fn(),
    addRef: jest.fn(),
    releaseRef: jest.fn(),
    forceRemove: jest.fn(),
    load: jest.fn(),
    isLoading: jest.fn(),
    getPendingLoad: jest.fn(),
  },
}));

jest.mock("../../../../utils/feature-flags", () => ({
  FF_IMAGE_MEMORY_USAGE: "fflag_image_memory_usage",
  isFF: jest.fn(() => false),
}));

jest.mock("../../../../utils/FileLoader", () => {
  return {
    FileLoader: jest.fn().mockImplementation(() => ({
      download: jest.fn(),
      isError: jest.fn(() => false),
      isPreloaded: jest.fn(() => false),
      getPreloadedURL: jest.fn(),
    })),
  };
});

const ModelWithMixin = types.compose(ImageEntityMixin).actions((self) => ({
  setCurrentEntity(entity) {
    self.currentImageEntity = entity;
  },
}));

const RootWithCrossOrigin = types.model({
  imageCrossOrigin: types.optional(types.string, "anonymous"),
  child: types.maybe(ModelWithMixin),
});

function createEntity(snapshot = {}) {
  const defaultSnapshot = {
    id: "img-1",
    src: "https://example.com/1.jpg",
    index: 0,
    ...snapshot,
  };
  return ModelWithMixin.create({
    imageEntities: [defaultSnapshot],
    currentImageEntity: null,
  });
}

function createEntityWithParent(imageCrossOrigin = "anonymous") {
  const root = RootWithCrossOrigin.create({
    imageCrossOrigin,
    child: {
      imageEntities: [{ id: "img-1", src: "https://example.com/1.jpg", index: 0 }],
      currentImageEntity: null,
    },
  });
  return root.child.imageEntities[0];
}

describe("ImageEntity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("views", () => {
    it("imageCrossOrigin returns anonymous when parent has no imageCrossOrigin", () => {
      const store = createEntity();
      const entity = store.imageEntities[0];
      expect(entity.imageCrossOrigin).toBe("anonymous");
    });

    it.skip("imageCrossOrigin returns parent imageCrossOrigin when in a tree with imageCrossOrigin", () => {
      const entity = createEntityWithParent("use-credentials");
      expect(entity.imageCrossOrigin).toBe("use-credentials");
    });
  });

  describe("markAsLoaded", () => {
    it("sets currentSrc, downloaded, progress to 1, and downloading to false", () => {
      const store = createEntity();
      const entity = store.imageEntities[0];
      entity.markAsLoaded("blob:http://example.com/abc");
      expect(entity.currentSrc).toBe("blob:http://example.com/abc");
      expect(entity.downloaded).toBe(true);
      expect(entity.progress).toBe(1);
      expect(entity.downloading).toBe(false);
    });

    it("adds cache ref when addCacheRef is true", () => {
      const store = createEntity();
      const entity = store.imageEntities[0];
      entity.markAsLoaded("blob:url", { addCacheRef: true });
      expect(imageCache.addRef).toHaveBeenCalledWith("https://example.com/1.jpg");
      expect(entity._hasCacheRef).toBe(true);
    });

    it("does not add cache ref twice when addCacheRef is true", () => {
      const store = createEntity();
      const entity = store.imageEntities[0];
      entity.markAsLoaded("blob:url1", { addCacheRef: true });
      entity.markAsLoaded("blob:url2", { addCacheRef: true });
      expect(imageCache.addRef).toHaveBeenCalledTimes(1);
    });
  });

  describe("markAsFailed", () => {
    it("sets error and stops downloading", () => {
      const store = createEntity();
      const entity = store.imageEntities[0];
      entity.setDownloading(true);
      entity.markAsFailed();
      expect(entity.error).toBe(true);
      expect(entity.downloading).toBe(false);
    });
  });

  describe("setProgress", () => {
    it("clamps progress to 0-100", () => {
      const store = createEntity();
      const entity = store.imageEntities[0];
      entity.setProgress(50);
      expect(entity.progress).toBe(50);
      entity.setProgress(150);
      expect(entity.progress).toBe(100);
      entity.setProgress(-10);
      expect(entity.progress).toBe(0);
    });
  });

  describe("setCurrentSrc", () => {
    it("updates currentSrc", () => {
      const store = createEntity();
      const entity = store.imageEntities[0];
      entity.setCurrentSrc("blob:new");
      expect(entity.currentSrc).toBe("blob:new");
    });
  });

  describe("releaseImage", () => {
    it("releases cache ref when _hasCacheRef is true", () => {
      const store = createEntity();
      const entity = store.imageEntities[0];
      entity.markAsLoaded("blob:url", { addCacheRef: true });
      entity.releaseImage();
      expect(imageCache.releaseRef).toHaveBeenCalledWith("https://example.com/1.jpg");
      expect(entity._hasCacheRef).toBe(false);
    });

    it("does nothing when _hasCacheRef is false", () => {
      const store = createEntity();
      const entity = store.imageEntities[0];
      entity.releaseImage();
      expect(imageCache.releaseRef).not.toHaveBeenCalled();
    });

    it("does nothing when src is empty", () => {
      const store = createEntity({ id: "img-2", src: "", index: 0 });
      const entity = store.imageEntities[0];
      entity.releaseImage();
      expect(imageCache.releaseRef).not.toHaveBeenCalled();
    });
  });

  describe("preload", () => {
    it("returns early when src is empty and does not start load", () => {
      imageCache.get.mockReturnValue(null);
      imageCache.isLoading.mockReturnValue(false);
      const store = createEntity({ id: "img-2", src: "", index: 0 });
      const entity = store.imageEntities[0];
      entity.preload();
      expect(imageCache.load).not.toHaveBeenCalled();
    });

    it("marks as loaded from cache when imageCache.get returns cached", () => {
      imageCache.get.mockReturnValue({ blobUrl: "blob:cached" });
      const store = createEntity();
      const entity = store.imageEntities[0];
      entity.preload();
      expect(entity.currentSrc).toBe("blob:cached");
      expect(entity.downloaded).toBe(true);
      expect(imageCache.load).not.toHaveBeenCalled();
    });
  });

  describe("ensurePreloaded", () => {
    it("returns true and marks as loaded when imageCache.get returns cached", () => {
      imageCache.get.mockReturnValue({ blobUrl: "blob:cached" });
      const store = createEntity();
      const entity = store.imageEntities[0];
      const result = entity.ensurePreloaded();
      expect(result).toBe(true);
      expect(entity.currentSrc).toBe("blob:cached");
      expect(entity.downloaded).toBe(true);
    });
  });

  describe("setError", () => {
    it("sets error and resets imageLoaded", () => {
      const store = createEntity();
      const entity = store.imageEntities[0];
      entity.setImageLoaded(true);
      entity.setError(true);
      expect(entity.error).toBe(true);
      expect(entity.imageLoaded).toBe(false);
    });

    it("attempts retry when _originalUrl is set and not yet retried", async () => {
      imageCache.get.mockReturnValue(null);
      imageCache.isLoading.mockReturnValue(false);
      let resolveLoad;
      const loadPromise = new Promise((r) => {
        resolveLoad = r;
      });
      imageCache.load.mockReturnValue(loadPromise);

      const store = createEntity();
      const entity = store.imageEntities[0];
      entity.preload();
      expect(entity._originalUrl).toBe("https://example.com/1.jpg");
      entity.setError(true);

      expect(imageCache.forceRemove).toHaveBeenCalledWith("https://example.com/1.jpg");
      expect(imageCache.load).toHaveBeenCalled();
      expect(entity._retryAttempted).toBe(true);
      resolveLoad({ blobUrl: "blob:retry" });
      await loadPromise;
    });
  });

  describe("afterCreate disposer", () => {
    it("calls releaseImage when node is destroyed", () => {
      const RootWithChild = types.model({ child: types.maybe(ModelWithMixin) }).actions((self) => ({
        clearChild() {
          self.child = undefined;
        },
      }));

      imageCache.get.mockReturnValue(null);
      const root = RootWithChild.create({
        child: {
          imageEntities: [{ id: "img-1", src: "https://example.com/1.jpg", index: 0 }],
          currentImageEntity: null,
        },
      });
      const entity = root.child.imageEntities[0];
      entity.markAsLoaded("blob:url", { addCacheRef: true });
      expect(entity._hasCacheRef).toBe(true);

      root.clearChild();
      expect(imageCache.releaseRef).toHaveBeenCalledWith("https://example.com/1.jpg");
    });
  });
});
