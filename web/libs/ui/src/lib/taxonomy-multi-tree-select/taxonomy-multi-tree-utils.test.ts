import {
  buildTaxonomyTreeData,
  getTaxonomyOptionPath,
  taxonomyCodeFromTreeId,
  taxonomySelectionToTreeId,
  taxonomySelectionsToTreeIds,
  treeIdsToTaxonomySelections,
} from "./taxonomy-multi-tree-utils";
import type { TaxonomyOption, TaxonomySelection } from "./types";

const flatOptions: TaxonomyOption[] = [
  { value: "english", label: "English", parentCode: null },
  { value: "spanish", label: "Spanish", parentCode: null },
];

const hierarchicalOptions: TaxonomyOption[] = [
  { value: "earth_sciences", label: "Earth Sciences", parentCode: null },
  { value: "rare_skill", label: "Rare Skill", parentCode: "earth_sciences" },
];

describe("taxonomy-multi-tree-utils", () => {
  it("builds nested tree data and disables unselected nodes at max", () => {
    const selected = new Set(["english"]);
    const tree = buildTaxonomyTreeData(flatOptions, selected, true);
    expect(tree).toHaveLength(2);
    expect(tree.find((node) => node.code === "english")?.disabled).toBeUndefined();
    expect(tree.find((node) => node.code === "spanish")?.disabled).toBe(true);
  });

  it("maps selection codes to hierarchical tree ids and back", () => {
    const byValue = new Map(hierarchicalOptions.map((option) => [option.value, option]));
    const selections: TaxonomySelection[] = [{ code: "rare_skill", label: "Rare Skill" }];
    const treeIds = taxonomySelectionsToTreeIds(selections, byValue);
    expect(treeIds).toEqual(["earth_sciences-rare_skill"]);
    expect(taxonomyCodeFromTreeId(treeIds[0])).toBe("rare_skill");
    expect(taxonomySelectionToTreeId("rare_skill", byValue)).toBe("earth_sciences-rare_skill");
    expect(getTaxonomyOptionPath("rare_skill", byValue)).toBe("Earth Sciences / Rare Skill");

    const roundTrip = treeIdsToTaxonomySelections(treeIds, byValue, selections);
    expect(roundTrip).toEqual([{ code: "rare_skill", label: "Rare Skill" }]);
  });

  it("preserves previous selection order when merging new tree ids", () => {
    const byValue = new Map(flatOptions.map((option) => [option.value, option]));
    const previous: TaxonomySelection[] = [
      { code: "spanish", label: "Spanish" },
      { code: "english", label: "English", level: "high" },
    ];
    // Tree emits path/DFS order (english before spanish); result should keep previous order.
    const merged = treeIdsToTaxonomySelections(["english", "spanish"], byValue, previous);
    expect(merged.map((selection) => selection.code)).toEqual(["spanish", "english"]);
    expect(merged[1]).toEqual({ code: "english", label: "English", level: "high" });
  });

  it("appends newly selected codes after existing selections", () => {
    const byValue = new Map(flatOptions.map((option) => [option.value, option]));
    const previous: TaxonomySelection[] = [{ code: "spanish", label: "Spanish" }];
    const merged = treeIdsToTaxonomySelections(["english", "spanish"], byValue, previous);
    expect(merged.map((selection) => selection.code)).toEqual(["spanish", "english"]);
  });
});
