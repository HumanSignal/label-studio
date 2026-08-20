import { describe, it, expect, mock, afterEach } from "bun:test";
import { destroy, types } from "mobx-state-tree";
import { Tab } from "./tab";
import { validateFilterSnapshot } from "./filter_snapshot_utils";
import { raceConditionLockToastMessage } from "./store";

const availableFilters = [{ id: "filter:tasks:image" }, { id: "filter:tasks:text" }, { id: "filter:tasks:created_at" }];

describe("validateFilterSnapshot", () => {
  it("returns valid items when snapshot matches available filters", () => {
    const snapshot = {
      conjunction: "and",
      items: [
        { filter: "filter:tasks:image", operator: "equal", value: "cat.jpg" },
        { filter: "filter:tasks:text", operator: "contains", value: "hello" },
      ],
    };
    const result = validateFilterSnapshot(snapshot, availableFilters);
    expect(result).toHaveLength(2);
    expect(result[0].filter).toBe("filter:tasks:image");
    expect(result[1].filter).toBe("filter:tasks:text");
  });

  it("filters out items whose column IDs are not in availableFilters", () => {
    const snapshot = {
      conjunction: "and",
      items: [
        { filter: "filter:tasks:image", operator: "equal", value: "cat.jpg" },
        { filter: "filter:tasks:nonexistent", operator: "equal", value: "x" },
      ],
    };
    const result = validateFilterSnapshot(snapshot, availableFilters);
    expect(result).toHaveLength(1);
    expect(result[0].filter).toBe("filter:tasks:image");
  });

  it("returns null when no items match available filters", () => {
    const snapshot = {
      conjunction: "and",
      items: [{ filter: "filter:tasks:unknown", operator: "equal", value: "x" }],
    };
    expect(validateFilterSnapshot(snapshot, availableFilters)).toBeNull();
  });

  it("returns null for null snapshot", () => {
    expect(validateFilterSnapshot(null, availableFilters)).toBeNull();
  });

  it("returns null for non-object snapshot", () => {
    expect(validateFilterSnapshot("string", availableFilters)).toBeNull();
    expect(validateFilterSnapshot(42, availableFilters)).toBeNull();
  });

  it("returns null when items is not an array", () => {
    expect(validateFilterSnapshot({ conjunction: "and", items: "bad" }, availableFilters)).toBeNull();
    expect(validateFilterSnapshot({ conjunction: "and" }, availableFilters)).toBeNull();
  });

  it("returns null when items array is empty", () => {
    expect(validateFilterSnapshot({ conjunction: "and", items: [] }, availableFilters)).toBeNull();
  });

  it("skips items with missing filter field", () => {
    const snapshot = {
      conjunction: "and",
      items: [
        { operator: "equal", value: "x" },
        { filter: null, operator: "equal", value: "x" },
        { filter: "filter:tasks:image", operator: "equal", value: "x" },
      ],
    };
    const result = validateFilterSnapshot(snapshot, availableFilters);
    expect(result).toHaveLength(1);
    expect(result[0].filter).toBe("filter:tasks:image");
  });

  it("preserves operator and value in returned items", () => {
    const snapshot = {
      conjunction: "or",
      items: [{ filter: "filter:tasks:created_at", operator: "greater", value: "2025-01-01" }],
    };
    const result = validateFilterSnapshot(snapshot, availableFilters);
    expect(result[0]).toEqual({
      filter: "filter:tasks:created_at",
      operator: "greater",
      value: "2025-01-01",
    });
  });

  it("works with empty availableFilters", () => {
    const snapshot = {
      conjunction: "and",
      items: [{ filter: "filter:tasks:image", operator: "equal", value: "x" }],
    };
    expect(validateFilterSnapshot(snapshot, [])).toBeNull();
  });
});

// Unique counter to avoid MST identifier collisions across test runs in Bun's shared process
let _tabIdCounter = 1000;

describe("Tab virtual serialize (FIT-1835)", () => {
  let tab;

  afterEach(() => {
    if (tab) {
      destroy(tab);
      tab = null;
    }
  });

  it("includes hiddenColumns in virtual tab serialization so annotator column config persists", () => {
    tab = Tab.create({ id: _tabIdCounter++, virtual: true });
    const result = tab.serialize();
    expect(result.hiddenColumns).toBeDefined();
    expect(result.hiddenColumns).toEqual({ explore: [], labeling: [] });
  });

  it("includes hiddenColumns with explore and labeling lists in virtual tab serialization", () => {
    tab = Tab.create({ id: _tabIdCounter++, virtual: true });
    const result = tab.serialize();
    expect(result).toHaveProperty("hiddenColumns");
    expect(result).toHaveProperty("hiddenColumns.explore");
    expect(result).toHaveProperty("hiddenColumns.labeling");
  });
});

const LockedTabTestRoot = types
  .model("LockedTabTestRoot", {
    views: types.array(Tab),
  })
  .volatile(() => ({
    _sdk: null,
  }))
  .views((self) => ({
    get SDK() {
      return self._sdk;
    },
  }))
  .actions((self) => ({
    setSDK(sdk) {
      self._sdk = sdk;
    },
  }));

describe("Tab locked copy by role (tabControls.lock)", () => {
  let root;

  afterEach(() => {
    if (root) {
      destroy(root);
      root = null;
    }
  });

  const createLockedTab = (tabControls = {}) => {
    root = LockedTabTestRoot.create({
      views: [
        {
          id: _tabIdCounter++,
          is_locked: true,
          locked_by: { name: "Ada Manager", email: "ada@example.com" },
        },
      ],
    });
    const toastInvoke = mock(() => {});

    root.setSDK({
      tabControls: { lock: true, ...tabControls },
      invoke: toastInvoke,
    });

    return { tab: root.views[0], toastInvoke };
  };

  it("shows locker name and unlock hint when tabControls.lock is true", () => {
    const { tab, toastInvoke } = createLockedTab({ lock: true });

    expect(tab.canManageLock).toBe(true);
    expect(tab.lockedIconTooltip).toBe("Locked by Ada Manager");
    expect(tab.lockedUpdateMessage).toBe("This tab is locked. Unlock it to update.");
    expect(tab.lockedFiltersMessage).toBe("This tab is locked. Unlock it to change filters.");

    tab.notifyLocked();
    expect(toastInvoke).toHaveBeenCalledWith("toast", {
      message: "This tab is locked. Unlock it to update.",
      type: "error",
    });
  });

  it("hides locker name and uses readonly copy when tabControls.lock is false", () => {
    const { tab, toastInvoke } = createLockedTab({ lock: false });

    expect(tab.canManageLock).toBe(false);
    expect(tab.lockedIconTooltip).toBe("Tab locked");
    expect(tab.lockedIconTooltip).not.toContain("Ada Manager");
    expect(tab.lockedUpdateMessage).toBe("This tab is locked. Changes are not allowed.");
    expect(tab.lockedFiltersMessage).toBe("This tab is locked. Filters cannot be changed.");

    tab.notifyLocked();
    expect(toastInvoke).toHaveBeenCalledWith("toast", {
      message: "This tab is locked. Changes are not allowed.",
      type: "error",
    });
  });

  it("falls back to Locked tooltip without locker name for managers", () => {
    root = LockedTabTestRoot.create({
      views: [{ id: _tabIdCounter++, is_locked: true, locked_by: null }],
    });
    root.setSDK({ tabControls: { lock: true }, invoke: () => {} });

    expect(root.views[0].lockedIconTooltip).toBe("Locked");
  });
});

describe("raceConditionLockToastMessage", () => {
  const lockedResult = {
    is_locked: true,
    locked_by: { name: "Ada Manager", email: "ada@example.com" },
  };

  it("includes locker name when canManageLock is true", () => {
    expect(raceConditionLockToastMessage(lockedResult, true)).toBe(
      "This tab was locked by Ada Manager. Your changes could not be saved.",
    );
  });

  it("omits locker name when canManageLock is false", () => {
    expect(raceConditionLockToastMessage(lockedResult, false)).toBe(
      "This tab was locked. Your changes could not be saved.",
    );
    expect(raceConditionLockToastMessage(lockedResult, false)).not.toContain("Ada Manager");
  });

  it("uses nameless copy when locker identity is missing", () => {
    expect(raceConditionLockToastMessage({ is_locked: true, locked_by: null }, true)).toBe(
      "This tab was locked. Your changes could not be saved.",
    );
  });
});
