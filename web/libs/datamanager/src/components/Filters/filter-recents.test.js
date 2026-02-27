import { getRecentFilterFields, addRecentFilterField, updateRecentFilterField } from "./filter-recents";

describe("filter-recents", () => {
  const projectId = 42;
  const storageKey = `dm:recentFilterFields:${projectId}`;

  beforeEach(() => {
    localStorage.clear();
  });

  describe("getRecentFilterFields", () => {
    it("returns empty array when no data stored", () => {
      expect(getRecentFilterFields(projectId)).toEqual([]);
    });

    it("returns empty array when projectId is falsy", () => {
      expect(getRecentFilterFields(null)).toEqual([]);
      expect(getRecentFilterFields(undefined)).toEqual([]);
      expect(getRecentFilterFields("")).toEqual([]);
    });

    it("reads stored entries as objects", () => {
      const data = [
        { id: "filter:tasks:a", operator: "equal", value: "1" },
        { id: "filter:tasks:b", operator: "contains", value: "hello" },
      ];
      localStorage.setItem(storageKey, JSON.stringify(data));
      expect(getRecentFilterFields(projectId)).toEqual(data);
    });

    it("caps at 3 items even if more are stored", () => {
      const data = [
        { id: "a", operator: null, value: null },
        { id: "b", operator: null, value: null },
        { id: "c", operator: null, value: null },
        { id: "d", operator: null, value: null },
        { id: "e", operator: null, value: null },
      ];
      localStorage.setItem(storageKey, JSON.stringify(data));
      expect(getRecentFilterFields(projectId)).toHaveLength(3);
    });

    it("handles corrupted JSON gracefully", () => {
      localStorage.setItem(storageKey, "not-valid-json");
      expect(getRecentFilterFields(projectId)).toEqual([]);
    });

    it("handles non-array JSON gracefully", () => {
      localStorage.setItem(storageKey, JSON.stringify({ foo: "bar" }));
      expect(getRecentFilterFields(projectId)).toEqual([]);
    });

    it("is backward compatible with old string-only format", () => {
      localStorage.setItem(storageKey, JSON.stringify(["filter:tasks:a", "filter:tasks:b"]));
      const result = getRecentFilterFields(projectId);
      expect(result).toEqual([
        { id: "filter:tasks:a", operator: null, value: null },
        { id: "filter:tasks:b", operator: null, value: null },
      ]);
    });

    it("filters out invalid entries", () => {
      localStorage.setItem(storageKey, JSON.stringify([null, 123, { id: "valid" }, "str"]));
      const result = getRecentFilterFields(projectId);
      expect(result).toEqual([{ id: "valid" }, { id: "str", operator: null, value: null }]);
    });
  });

  describe("addRecentFilterField", () => {
    it("adds a new entry with full state", () => {
      addRecentFilterField(projectId, "filter:tasks:image_1", "equal", "42");
      const result = getRecentFilterFields(projectId);
      expect(result).toEqual([{ id: "filter:tasks:image_1", operator: "equal", value: "42" }]);
    });

    it("defaults operator and value to null", () => {
      addRecentFilterField(projectId, "filter:tasks:image_1");
      const result = getRecentFilterFields(projectId);
      expect(result).toEqual([{ id: "filter:tasks:image_1", operator: null, value: null }]);
    });

    it("moves existing ID to the front and updates its state", () => {
      addRecentFilterField(projectId, "filter:tasks:a", "contains", "old");
      addRecentFilterField(projectId, "filter:tasks:b", "equal", "2");
      addRecentFilterField(projectId, "filter:tasks:a", "regex", "new.*");
      const result = getRecentFilterFields(projectId);
      expect(result).toEqual([
        { id: "filter:tasks:a", operator: "regex", value: "new.*" },
        { id: "filter:tasks:b", operator: "equal", value: "2" },
      ]);
    });

    it("caps at 3 recent items", () => {
      addRecentFilterField(projectId, "filter:tasks:a", "equal", "1");
      addRecentFilterField(projectId, "filter:tasks:b", "equal", "2");
      addRecentFilterField(projectId, "filter:tasks:c", "equal", "3");
      addRecentFilterField(projectId, "filter:tasks:d", "equal", "4");
      const result = getRecentFilterFields(projectId);
      expect(result).toEqual([
        { id: "filter:tasks:d", operator: "equal", value: "4" },
        { id: "filter:tasks:c", operator: "equal", value: "3" },
        { id: "filter:tasks:b", operator: "equal", value: "2" },
      ]);
    });

    it("does nothing when projectId or filterTypeId is falsy", () => {
      addRecentFilterField(null, "filter:tasks:a");
      addRecentFilterField(projectId, "");
      addRecentFilterField(projectId, null);
      expect(localStorage.getItem(storageKey)).toBeNull();
    });

    it("stores per project independently", () => {
      addRecentFilterField(1, "filter:tasks:a", "equal", "x");
      addRecentFilterField(2, "filter:tasks:b", "contains", "y");
      expect(getRecentFilterFields(1)).toEqual([{ id: "filter:tasks:a", operator: "equal", value: "x" }]);
      expect(getRecentFilterFields(2)).toEqual([{ id: "filter:tasks:b", operator: "contains", value: "y" }]);
    });
  });

  describe("updateRecentFilterField", () => {
    it("updates operator and value without changing order", () => {
      addRecentFilterField(projectId, "filter:tasks:a", "equal", "1");
      addRecentFilterField(projectId, "filter:tasks:b", "contains", "hello");
      updateRecentFilterField(projectId, "filter:tasks:a", "regex", "new.*");
      const result = getRecentFilterFields(projectId);
      expect(result).toEqual([
        { id: "filter:tasks:b", operator: "contains", value: "hello" },
        { id: "filter:tasks:a", operator: "regex", value: "new.*" },
      ]);
    });

    it("appends new entry at the end when it does not exist yet", () => {
      addRecentFilterField(projectId, "filter:tasks:a", "equal", "1");
      updateRecentFilterField(projectId, "filter:tasks:new", "contains", "x");
      const result = getRecentFilterFields(projectId);
      expect(result).toEqual([
        { id: "filter:tasks:a", operator: "equal", value: "1" },
        { id: "filter:tasks:new", operator: "contains", value: "x" },
      ]);
    });

    it("caps at MAX_RECENT_FIELDS when appending new entries", () => {
      addRecentFilterField(projectId, "filter:tasks:a", "equal", "1");
      addRecentFilterField(projectId, "filter:tasks:b", "equal", "2");
      addRecentFilterField(projectId, "filter:tasks:c", "equal", "3");
      // List is full (3 items). Appending a 4th should keep only the first 3.
      updateRecentFilterField(projectId, "filter:tasks:d", "equal", "4");
      const result = getRecentFilterFields(projectId);
      expect(result).toHaveLength(3);
      expect(result.map((e) => e.id)).toEqual(["filter:tasks:c", "filter:tasks:b", "filter:tasks:a"]);
    });

    it("does nothing when projectId or filterTypeId is falsy", () => {
      addRecentFilterField(projectId, "filter:tasks:a", "equal", "1");
      updateRecentFilterField(null, "filter:tasks:a", "regex", "x");
      updateRecentFilterField(projectId, "", "regex", "x");
      const result = getRecentFilterFields(projectId);
      expect(result).toEqual([{ id: "filter:tasks:a", operator: "equal", value: "1" }]);
    });
  });

  describe("backward compatibility", () => {
    it("reads old string format and new additions work together", () => {
      localStorage.setItem(storageKey, JSON.stringify(["filter:tasks:old_field"]));
      addRecentFilterField(projectId, "filter:tasks:new_field", "equal", "1");
      const result = getRecentFilterFields(projectId);
      expect(result).toEqual([
        { id: "filter:tasks:new_field", operator: "equal", value: "1" },
        { id: "filter:tasks:old_field", operator: null, value: null },
      ]);
    });
  });
});
