import { LIST_MEMBERSHIP_OPS, supportsListMembership } from "./list-membership";

describe("LIST_MEMBERSHIP_OPS", () => {
  it("contains in_list and not_in_list", () => {
    expect(LIST_MEMBERSHIP_OPS.has("in_list")).toBe(true);
    expect(LIST_MEMBERSHIP_OPS.has("not_in_list")).toBe(true);
  });

  it("does not contain other operators", () => {
    expect(LIST_MEMBERSHIP_OPS.has("equal")).toBe(false);
    expect(LIST_MEMBERSHIP_OPS.has("contains")).toBe(false);
    expect(LIST_MEMBERSHIP_OPS.has("in")).toBe(false);
  });
});

describe("supportsListMembership", () => {
  const make = (id: string) => ({ filter: { id } });

  it("returns true for Task ID column", () => {
    expect(supportsListMembership(make("filter:tasks:id"))).toBe(true);
  });

  it("returns true for Inner ID column", () => {
    expect(supportsListMembership(make("filter:tasks:inner_id"))).toBe(true);
  });

  it("returns true for any task.data.* column", () => {
    expect(supportsListMembership(make("filter:tasks:data.object_id"))).toBe(true);
    expect(supportsListMembership(make("filter:tasks:data.batch.x"))).toBe(true);
    expect(supportsListMembership(make("filter:tasks:data."))).toBe(true);
  });

  it("returns false for annotations_ids", () => {
    expect(supportsListMembership(make("filter:tasks:annotations_ids"))).toBe(false);
  });

  it("returns false for annotators / reviewers / updated_by", () => {
    expect(supportsListMembership(make("filter:tasks:annotators"))).toBe(false);
    expect(supportsListMembership(make("filter:tasks:reviewers"))).toBe(false);
    expect(supportsListMembership(make("filter:tasks:updated_by"))).toBe(false);
  });

  it("returns true for annotation/prediction counter columns", () => {
    expect(supportsListMembership(make("filter:tasks:total_annotations"))).toBe(true);
    expect(supportsListMembership(make("filter:tasks:total_predictions"))).toBe(true);
    expect(supportsListMembership(make("filter:tasks:cancelled_annotations"))).toBe(true);
  });

  it("returns false for created_at and completed_at", () => {
    expect(supportsListMembership(make("filter:tasks:created_at"))).toBe(false);
    expect(supportsListMembership(make("filter:tasks:completed_at"))).toBe(false);
  });

  it("returns false for prefix-spoofing strings", () => {
    expect(supportsListMembership(make("data.object_id"))).toBe(false);
    expect(supportsListMembership(make("filter:tasks:id_other"))).toBe(false);
    expect(supportsListMembership(make("filter:tasks:datafoo"))).toBe(false);
  });

  it("returns false for missing or malformed filter object", () => {
    expect(supportsListMembership(undefined)).toBe(false);
    expect(supportsListMembership(null)).toBe(false);
    expect(supportsListMembership({})).toBe(false);
    expect(supportsListMembership({ filter: {} })).toBe(false);
    expect(supportsListMembership({ filter: { id: 123 } })).toBe(false);
  });
});
