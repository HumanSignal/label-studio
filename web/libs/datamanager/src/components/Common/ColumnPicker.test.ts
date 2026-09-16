import { describe, expect, it } from "bun:test";
import { filtersToPickerGroups } from "./ColumnPicker";

function makeFilter(id: string, title: string, opts: { parentTitle?: string; alias?: string } = {}) {
  const parent = opts.parentTitle ? { key: `parent:${opts.parentTitle}`, title: opts.parentTitle } : undefined;
  return {
    id,
    type: "String",
    field: {
      title,
      alias: opts.alias ?? title.toLowerCase(),
      parent,
      icon: undefined,
      enterprise_badge: undefined,
      disabled: false,
      readableType: "String",
    },
    schema: {},
  };
}

describe("filtersToPickerGroups alphabetical ordering", () => {
  it("sorts items A→Z within each non-Recent group by title", () => {
    const filters = [
      makeFilter("filter:tasks:zebra", "zebra"),
      makeFilter("filter:tasks:apple", "Apple"),
      makeFilter("filter:data:mango", "mango", { parentTitle: "Data" }),
      makeFilter("filter:data:banana", "Banana", { parentTitle: "Data" }),
      makeFilter("filter:tasks:agreement", "Agreement score", { alias: "agreement" }),
      makeFilter("filter:tasks:dim_b", "beta_dim", { alias: "dimension_agreement_beta" }),
      makeFilter("filter:tasks:dim_a", "Alpha_dim", { alias: "dimension_agreement_alpha" }),
    ];

    const groups = filtersToPickerGroups(filters as any);
    const byTitle = Object.fromEntries(groups.map((g) => [g.title ?? "__root__", g.items.map((i) => i.title)]));

    expect(byTitle.Task).toEqual(["Apple", "zebra"]);
    expect(byTitle.Data).toEqual(["Banana", "mango"]);
    expect(byTitle.Agreement).toEqual(["Agreement score", "Alpha_dim", "beta_dim"]);
  });

  it("preserves Recent entry order and does not alphabetize Recent", () => {
    const filters = [
      makeFilter("filter:tasks:zebra", "zebra"),
      makeFilter("filter:tasks:apple", "Apple"),
      makeFilter("filter:tasks:mango", "mango"),
    ];
    const recentEntries = [
      { id: "filter:tasks:zebra", operator: null, value: null },
      { id: "filter:tasks:mango", operator: null, value: null },
    ];

    const groups = filtersToPickerGroups(filters as any, recentEntries);
    const recent = groups.find((g) => g.key === "__recent__");

    expect(recent?.items.map((i) => i.title)).toEqual(["zebra", "mango"]);
  });

  it("keeps group order: Recent, Task, Agreement, then parent groups", () => {
    const filters = [
      makeFilter("filter:data:b", "b", { parentTitle: "Data" }),
      makeFilter("filter:tasks:z", "z"),
      makeFilter("filter:tasks:agreement", "Agreement", { alias: "agreement" }),
    ];
    const recentEntries = [{ id: "filter:tasks:z", operator: null, value: null }];

    const titles = filtersToPickerGroups(filters as any, recentEntries).map((g) => g.title);

    expect(titles).toEqual(["Recent", "Task", "Agreement", "Data"]);
  });
});
