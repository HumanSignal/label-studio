import { describe, expect, it } from "bun:test";
import {
  deduplicateUsers,
  getUsersItemCount,
  getUsersPageSize,
  mergeSelectedUsers,
  normalizeSelectedUserIds,
} from "./useUsers";

const user = (id: number) => ({
  id,
  username: `user-${id}`,
  first_name: "",
  last_name: "",
  email: `user-${id}@example.com`,
});

describe("Data Manager user multiselect helpers", () => {
  it("normalizes scalar and list selections", () => {
    expect(normalizeSelectedUserIds(null)).toEqual([]);
    expect(normalizeSelectedUserIds(7)).toEqual([7]);
    expect(normalizeSelectedUserIds([7, 8, 7])).toEqual([7, 8]);
  });

  it("requests enough first-page options to rehydrate every selected user", () => {
    expect(getUsersPageSize(10, [1, 2])).toBe(10);
    expect(
      getUsersPageSize(
        10,
        Array.from({ length: 12 }, (_, index) => index + 1),
      ),
    ).toBe(12);
  });

  it("preserves selected users during search without corrupting the server count", () => {
    const response = { results: [user(3), user(4)], count: 25 };
    const cachedUsers = [user(1), user(2), user(3)];

    expect(mergeSelectedUsers(response, cachedUsers, [1, 2])).toEqual({
      results: [user(3), user(4), user(1), user(2)],
      count: 25,
      displayCount: 27,
    });
  });

  it("deduplicates users by id while preserving their first-page order", () => {
    expect(deduplicateUsers([user(1), user(2), { ...user(1), email: "new@example.com" }, user(3)])).toEqual([
      { ...user(1), email: "new@example.com" },
      user(2),
      user(3),
    ]);
  });

  it("uses the deduplicated option count after the final page", () => {
    expect(getUsersItemCount(304, 304, true)).toBe(304);
    expect(getUsersItemCount(305, 304, false)).toBe(304);
  });
});
