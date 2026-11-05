import { REVIEW_BADGES } from "./Annotators";

describe("Annotators review badges", () => {
  it("keeps the review colours: kale accepted, persimmon rejected", () => {
    expect(REVIEW_BADGES.accepted.variant).toBe("kale");
    expect(REVIEW_BADGES.rejected.variant).toBe("persimmon");
  });

  it("draws fixed annotations in grape, never canteloupe", () => {
    expect(REVIEW_BADGES.fixed.variant).toBe("grape");
  });

  it("labels every badge for screen readers", () => {
    for (const badge of Object.values(REVIEW_BADGES)) expect(badge.label).toBeTruthy();
  });
});
