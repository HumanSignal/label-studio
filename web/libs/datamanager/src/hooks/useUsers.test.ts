import { describe, expect, it } from "bun:test";
import * as userHooks from "./useUsers";
import {
  appendSelectedUsers,
  deduplicateUsers,
  getUsersItemCount,
  normalizeSelectedUserIds,
  normalizeUsersResponse,
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

  it("chunks large selected-value sets", () => {
    const selectedIds = Array.from({ length: 205 }, (_, index) => index + 1);
    const chunkSelectedUserIds = (
      userHooks as typeof userHooks & {
        chunkSelectedUserIds?: (ids: number[]) => number[][];
      }
    ).chunkSelectedUserIds;

    expect(typeof chunkSelectedUserIds).toBe("function");
    expect(chunkSelectedUserIds?.(selectedIds).map((chunk) => chunk.length)).toEqual([100, 100, 5]);
  });

  it("normalizes array-shaped paginated responses without losing counts", () => {
    const results = [user(1), user(2)];
    const response = Object.assign(results, { count: 25, displayCount: 27 });

    expect(normalizeUsersResponse(response)).toEqual({
      results,
      count: 25,
      displayCount: 27,
    });
  });

  it("preserves object-shaped paginated responses", () => {
    const response = { results: [user(1), user(2)], count: 25, displayCount: 27 };

    expect(normalizeUsersResponse(response)).toEqual(response);
  });

  it("keeps the server order and appends only selected users the pages do not hold", () => {
    expect(appendSelectedUsers([user(1), user(2), user(3)], [user(2), user(9)]).map(({ id }) => id)).toEqual([
      1, 2, 3, 9,
    ]);
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
