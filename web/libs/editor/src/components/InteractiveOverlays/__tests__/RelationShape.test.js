/**
 * Unit tests for RelationShape (components/InteractiveOverlays/RelationShape.js)
 */
import { BoundingBox } from "../BoundingBox";
import { RelationShape } from "../RelationShape";

describe("RelationShape", () => {
  const mockElement = { getBoundingClientRect: () => ({}) };
  let bboxSpy;

  beforeEach(() => {
    clearAllMocks();
    bboxSpy = spyOn(BoundingBox, "bbox").mockImplementation(() => [{ x: 0, y: 0, width: 10, height: 10 }]);
  });

  afterEach(() => {
    bboxSpy?.mockRestore?.();
  });

  describe("constructor", () => {
    it("assigns params and does not create watcher when watcher is not provided", () => {
      const params = { root: document.body, element: mockElement };
      const shape = new RelationShape(params);

      expect(shape.params.root).toBe(params.root);
      expect(shape.params.element).toBe(params.element);
      expect(shape._watcher).toBeUndefined();
    });

    it("creates watcher when watcher constructor is provided", () => {
      const WatcherClass = mock();
      const root = document.body;
      const shape = new RelationShape({
        root,
        element: mockElement,
        watcher: WatcherClass,
      });

      expect(WatcherClass).toHaveBeenCalledWith(root, mockElement, shape.onChanged);
      if (Array.isArray(WatcherClass.mock?.instances) && WatcherClass.mock.instances.length > 0) {
        expect(shape._watcher).toBe(WatcherClass.mock.instances[0]);
      }
    });
  });

  describe("boundingBox", () => {
    it("returns BoundingBox.bbox for params.element", () => {
      const shape = new RelationShape({ element: mockElement });
      BoundingBox.bbox.mockReturnValue([{ x: 1, y: 2, width: 3, height: 4 }]);

      const result = shape.boundingBox();

      expect(BoundingBox.bbox).toHaveBeenCalledWith(mockElement);
      expect(result).toEqual([{ x: 1, y: 2, width: 3, height: 4 }]);
    });
  });

  describe("onUpdate", () => {
    it("sets the callback so onChanged invokes it", () => {
      const shape = new RelationShape({ element: mockElement });
      const callback = mock();

      shape.onUpdate(callback);
      shape.onChanged();

      expect(callback).toHaveBeenCalled();
    });
  });

  describe("onChanged", () => {
    it("calls onUpdated when set", () => {
      const shape = new RelationShape({ element: mockElement });
      const callback = mock();
      shape.onUpdate(callback);

      shape.onChanged();

      expect(callback).toHaveBeenCalled();
    });

    it("does not throw when onUpdated is not set", () => {
      const shape = new RelationShape({ element: mockElement });

      expect(() => shape.onChanged()).not.toThrow();
    });
  });

  describe("destroy", () => {
    it("clears onUpdated", () => {
      const shape = new RelationShape({ element: mockElement });
      const callback = mock();
      shape.onUpdate(callback);

      shape.destroy();
      shape.onChanged();

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
