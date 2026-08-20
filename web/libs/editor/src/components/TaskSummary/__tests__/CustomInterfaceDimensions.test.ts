/**
 * Classification of Custom Interface dimensions.
 *
 * A Custom Interface has no labeling config, so the backend reports every one
 * of its dimensions as `is_categorical: false` regardless of what the field
 * actually holds. The dashboard recovers the distinction from the values, and
 * shows the ones it still cannot classify rather than hiding them.
 */

import { describe, expect, it } from "bun:test";
import { buildDimensionInfoList } from "../agreement-dashboard/agreement-utils";
import type { DimensionMeta, TaskAgreementResult } from "../agreement-dashboard/types";

const CUSTOM_INTERFACE_META: DimensionMeta = {
  name: "sentiment",
  control_tag: "CustomInterface",
  metric_type: "EXACT_MATCH",
  // What the backend always sends for a Custom Interface.
  is_categorical: false,
};

function agreementWith(values: unknown[] | null, meta: DimensionMeta = CUSTOM_INTERFACE_META): TaskAgreementResult {
  return {
    dimension_results: [
      {
        dimension_id: 1,
        scores: [[1]],
        match_metadata: null,
        dimension_values: values,
      },
    ],
    aggregation: {
      pairwise_agreement: 1,
      consensus_agreement: 1,
      dimension_pairwise_agreements: { 1: 1 },
      dimension_consensus_agreements: { 1: 1 },
      n_annotators: 1,
    },
    annotator_ids: [1],
    dimension_meta: { 1: meta },
  };
}

function buildOne(values: unknown[] | null, meta?: DimensionMeta) {
  return buildDimensionInfoList(agreementWith(values, meta))[0];
}

describe("buildDimensionInfoList — Custom Interface dimensions", () => {
  it("treats string values as a classification", () => {
    expect(buildOne(["Positive", "Negative", "Positive"]).isCategorical).toBe(true);
  });

  it("treats number values as a classification", () => {
    expect(buildOne([1, 5, 3]).isCategorical).toBe(true);
  });

  it("treats boolean values as a classification", () => {
    expect(buildOne([true, false, true]).isCategorical).toBe(true);
  });

  it("treats nested arrays of scalars as a classification (taxonomy / multi-select)", () => {
    expect(
      buildOne([
        ["Sports", "Football"],
        ["Sports", "Basketball"],
      ]).isCategorical,
    ).toBe(true);
    expect(buildOne([["a", "b"], ["a"]]).isCategorical).toBe(true);
  });

  it("ignores nulls from annotators who left the field empty", () => {
    expect(buildOne(["Positive", null, "Negative"]).isCategorical).toBe(true);
  });

  // Region-shaped output cannot be compared cell by cell.
  it("leaves object values non-categorical", () => {
    expect(buildOne([{ x: 1 }]).isCategorical).toBe(false);
  });

  it("leaves arrays of objects non-categorical", () => {
    expect(buildOne([[{ x: 1, y: 2 }]]).isCategorical).toBe(false);
  });

  it("leaves a dimension with no values at all non-categorical", () => {
    expect(buildOne(null).isCategorical).toBe(false);
    expect(buildOne([null, null]).isCategorical).toBe(false);
  });

  it("flags the dimension as coming from a Custom Interface", () => {
    expect(buildOne(["Positive"]).isCustomInterface).toBe(true);
  });
});

describe("buildDimensionInfoList — native control tags", () => {
  const choicesMeta: DimensionMeta = {
    name: "sentiment",
    control_tag: "Choices",
    metric_type: "EXACT_MATCH",
    is_categorical: true,
  };

  const rectangleMeta: DimensionMeta = {
    name: "boxes",
    control_tag: "RectangleLabels",
    metric_type: "IOU",
    is_categorical: false,
  };

  it("keeps trusting the backend for a real control tag", () => {
    const choices = buildOne(["Positive"], choicesMeta);
    expect(choices.isCategorical).toBe(true);
    expect(choices.isCustomInterface).toBe(false);
  });

  // The scalar fallback must not leak into controls the backend can classify.
  it("does not promote a non-categorical native dimension with scalar values", () => {
    expect(buildOne(["something"], rectangleMeta).isCategorical).toBe(false);
  });
});
