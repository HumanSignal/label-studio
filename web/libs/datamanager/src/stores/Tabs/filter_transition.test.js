import { recoverReviewIndicatorSnapshot, resolveFilterTransition } from "./filter_snapshot_utils";

/*
 * Operator definitions per filter type, mirroring the real exports from
 * components/Filters/types/index.js. Only the `key` field is relevant for
 * transition logic — input components are not needed.
 */
const OPERATORS = {
  String: [{ key: "contains" }, { key: "not_contains" }, { key: "regex" }, { key: "equal" }, { key: "not_equal" }],
  Image: [{ key: "contains" }, { key: "not_contains" }, { key: "regex" }, { key: "equal" }, { key: "not_equal" }],
  Number: [
    { key: "equal" },
    { key: "not_equal" },
    { key: "less" },
    { key: "greater" },
    { key: "less_or_equal" },
    { key: "greater_or_equal" },
    { key: "in" },
    { key: "not_in" },
  ],
  Time: [
    { key: "equal" },
    { key: "not_equal" },
    { key: "less" },
    { key: "greater" },
    { key: "less_or_equal" },
    { key: "greater_or_equal" },
    { key: "in" },
    { key: "not_in" },
  ],
  AgreementSelected: [
    { key: "equal" },
    { key: "not_equal" },
    { key: "less" },
    { key: "greater" },
    { key: "less_or_equal" },
    { key: "greater_or_equal" },
    { key: "in" },
    { key: "not_in" },
  ],
  Date: [{ key: "less" }, { key: "greater" }, { key: "in" }, { key: "not_in" }],
  Datetime: [{ key: "less" }, { key: "greater" }, { key: "in" }, { key: "not_in" }],
  Boolean: [{ key: "equal" }],
  Common: [{ key: "empty" }],
  List: [{ key: "contains" }, { key: "not_contains" }],
  TaskState: [{ key: "contains" }, { key: "not_contains" }],
};

const ALL_TYPES = Object.keys(OPERATORS);

const REPRESENTATIVE_VALUES = {
  String: "hello world",
  Image: "cat.jpg",
  Number: 42,
  Time: 120,
  AgreementSelected: 0.85,
  Date: "2026-03-10",
  Datetime: "2026-03-10T00:00:00.000Z",
  Boolean: true,
  Common: false,
  List: "item1",
  TaskState: "completed",
};

/*
 * Types whose columns typically carry a schema (dropdown with column-specific items).
 * Value must never be preserved across these even when the type matches.
 */
const SCHEMA_BOUND_TYPES = new Set(["List", "TaskState"]);

const MOCK_SCHEMA = { items: [{ value: 1, title: "option1" }] };
const RANGE_OPERATOR_KEYS = new Set(["in", "not_in"]);

describe("resolveFilterTransition — full type×type matrix", () => {
  const operatorKeys = (type) => OPERATORS[type].map((op) => op.key);

  describe("same type, no schema → keeps operator and value", () => {
    for (const type of ALL_TYPES) {
      if (SCHEMA_BOUND_TYPES.has(type)) continue;

      const ops = OPERATORS[type];
      const firstOp = ops[0].key;
      const val = REPRESENTATIVE_VALUES[type];

      it(`${type} → ${type} (no schema) keeps operator "${firstOp}" and value`, () => {
        const result = resolveFilterTransition({
          prevType: type,
          prevOperator: firstOp,
          prevValue: val,
          newType: type,
          newOperators: ops,
          newSchema: null,
        });

        expect(result.operator).toBe(firstOp);
        expect(result.value).toBe(val);
        expect(result.valueReset).toBe(false);
      });
    }
  });

  describe("same type, WITH schema → keeps operator, resets value", () => {
    for (const type of SCHEMA_BOUND_TYPES) {
      const ops = OPERATORS[type];
      const firstOp = ops[0].key;
      const val = REPRESENTATIVE_VALUES[type];

      it(`${type} → ${type} (with schema) keeps operator "${firstOp}" but resets value`, () => {
        const result = resolveFilterTransition({
          prevType: type,
          prevOperator: firstOp,
          prevValue: val,
          newType: type,
          newOperators: ops,
          newSchema: MOCK_SCHEMA,
        });

        expect(result.operator).toBe(firstOp);
        expect(result.valueReset).toBe(true);
        expect(result.value).toBeUndefined();
      });
    }
  });

  describe("cross-type transitions: value is always reset, operator kept only if compatible", () => {
    for (const fromType of ALL_TYPES) {
      for (const toType of ALL_TYPES) {
        if (fromType === toType) continue;

        const fromOps = OPERATORS[fromType];
        const toOps = OPERATORS[toType];
        const toOpKeys = new Set(operatorKeys(toType));

        for (const fromOp of fromOps) {
          const sharedOp = toOpKeys.has(fromOp.key);
          const scenario = sharedOp ? "shared operator" : "incompatible operator";

          it(`${fromType}(${fromOp.key}) → ${toType}: ${scenario}`, () => {
            const result = resolveFilterTransition({
              prevType: fromType,
              prevOperator: fromOp.key,
              prevValue: REPRESENTATIVE_VALUES[fromType],
              newType: toType,
              newOperators: toOps,
            });

            expect(result.valueReset).toBe(true);
            expect(result.value).toBeUndefined();

            if (sharedOp && !RANGE_OPERATOR_KEYS.has(fromOp.key)) {
              expect(result.operator).toBe(fromOp.key);
            } else {
              expect(result.operator).toBe(toOps[0].key);
            }
          });
        }
      }
    }
  });

  describe("edge cases", () => {
    it("null prevOperator always resets to first operator of target type", () => {
      for (const toType of ALL_TYPES) {
        const result = resolveFilterTransition({
          prevType: "String",
          prevOperator: null,
          prevValue: "test",
          newType: toType,
          newOperators: OPERATORS[toType],
        });

        expect(result.operator).toBe(OPERATORS[toType][0].key);
        expect(result.valueReset).toBe(true);
      }
    });

    it("undefined prevOperator always resets to first operator", () => {
      const result = resolveFilterTransition({
        prevType: "Number",
        prevOperator: undefined,
        prevValue: 42,
        newType: "String",
        newOperators: OPERATORS.String,
      });

      expect(result.operator).toBe("contains");
      expect(result.valueReset).toBe(true);
    });

    it("empty string prevOperator always resets to first operator", () => {
      const result = resolveFilterTransition({
        prevType: "Number",
        prevOperator: "",
        prevValue: 42,
        newType: "String",
        newOperators: OPERATORS.String,
      });

      expect(result.operator).toBe("contains");
      expect(result.valueReset).toBe(true);
    });

    it("prevValue null is preserved on same-type transition with valid operator", () => {
      const result = resolveFilterTransition({
        prevType: "String",
        prevOperator: "contains",
        prevValue: null,
        newType: "String",
        newOperators: OPERATORS.String,
      });

      expect(result.operator).toBe("contains");
      expect(result.value).toBeNull();
      expect(result.valueReset).toBe(false);
    });

    it("operator valid in source but not in target falls back to target default", () => {
      const result = resolveFilterTransition({
        prevType: "String",
        prevOperator: "regex",
        prevValue: "^foo.*",
        newType: "Number",
        newOperators: OPERATORS.Number,
      });

      expect(result.operator).toBe("equal");
      expect(result.valueReset).toBe(true);
    });
  });

  describe("the exact bug scenario: Datetime → Time/Number with shared operator", () => {
    it("Datetime(less) → Time: keeps operator, resets datetime value", () => {
      const result = resolveFilterTransition({
        prevType: "Datetime",
        prevOperator: "less",
        prevValue: "2026-03-10T00:00:00.000Z",
        newType: "Time",
        newOperators: OPERATORS.Time,
      });

      expect(result.operator).toBe("less");
      expect(result.valueReset).toBe(true);
      expect(result.value).toBeUndefined();
    });

    it("Datetime(less) → Number: keeps operator, resets datetime value", () => {
      const result = resolveFilterTransition({
        prevType: "Datetime",
        prevOperator: "less",
        prevValue: "2026-03-10T00:00:00.000Z",
        newType: "Number",
        newOperators: OPERATORS.Number,
      });

      expect(result.operator).toBe("less");
      expect(result.valueReset).toBe(true);
      expect(result.value).toBeUndefined();
    });

    it("Number(less) → Datetime: keeps operator, resets numeric value", () => {
      const result = resolveFilterTransition({
        prevType: "Number",
        prevOperator: "less",
        prevValue: 42,
        newType: "Datetime",
        newOperators: OPERATORS.Datetime,
      });

      expect(result.operator).toBe("less");
      expect(result.valueReset).toBe(true);
      expect(result.value).toBeUndefined();
    });
  });

  describe("alias types share operators — operator preserved, value still reset", () => {
    it("Number → AgreementSelected: same ops, but different type name → value reset", () => {
      const result = resolveFilterTransition({
        prevType: "Number",
        prevOperator: "greater_or_equal",
        prevValue: 0.5,
        newType: "AgreementSelected",
        newOperators: OPERATORS.AgreementSelected,
      });

      expect(result.operator).toBe("greater_or_equal");
      expect(result.valueReset).toBe(true);
    });

    it("String → Image: same ops, but different type name → value reset", () => {
      const result = resolveFilterTransition({
        prevType: "String",
        prevOperator: "contains",
        prevValue: "hello",
        newType: "Image",
        newOperators: OPERATORS.Image,
      });

      expect(result.operator).toBe("contains");
      expect(result.valueReset).toBe(true);
    });

    it("Date → Datetime: same ops, different type name → value reset", () => {
      const result = resolveFilterTransition({
        prevType: "Date",
        prevOperator: "greater",
        prevValue: "2026-01-01",
        newType: "Datetime",
        newOperators: OPERATORS.Datetime,
      });

      expect(result.operator).toBe("greater");
      expect(result.valueReset).toBe(true);
    });
  });

  describe("schema-bound columns: value never preserved across columns", () => {
    it("List → List (both have schema): operator kept, value reset", () => {
      const result = resolveFilterTransition({
        prevType: "List",
        prevOperator: "not_contains",
        prevValue: ["model_v1", "model_v2"],
        newType: "List",
        newOperators: OPERATORS.List,
        newSchema: MOCK_SCHEMA,
      });

      expect(result.operator).toBe("not_contains");
      expect(result.valueReset).toBe(true);
      expect(result.value).toBeUndefined();
    });

    it("the exact backend crash: List(prediction model versions) → List(annotated by)", () => {
      const result = resolveFilterTransition({
        prevType: "List",
        prevOperator: "not_contains",
        prevValue: ["gpt-4", "llama-3"],
        newType: "List",
        newOperators: OPERATORS.List,
        newSchema: {
          items: [
            { value: 1, title: "User A" },
            { value: 2, title: "User B" },
          ],
        },
      });

      expect(result.operator).toBe("not_contains");
      expect(result.valueReset).toBe(true);
      expect(result.value).toBeUndefined();
    });

    it("List → List without static schema (UserSelect annotators): resets stale values", () => {
      const result = resolveFilterTransition({
        prevType: "List",
        prevOperator: "contains",
        prevValue: ["gpt-4"],
        newType: "List",
        newOperators: OPERATORS.List,
        newSchema: null,
      });

      expect(result.operator).toBe("contains");
      expect(result.valueReset).toBe(true);
      expect(result.value).toBeUndefined();
    });

    it("String(no schema) → List(schema): different type + schema → value reset", () => {
      const result = resolveFilterTransition({
        prevType: "String",
        prevOperator: "contains",
        prevValue: "hello",
        newType: "List",
        newOperators: OPERATORS.List,
        newSchema: MOCK_SCHEMA,
      });

      expect(result.operator).toBe("contains");
      expect(result.valueReset).toBe(true);
    });

    it("List(schema) → String(no schema): different type → value reset regardless", () => {
      const result = resolveFilterTransition({
        prevType: "List",
        prevOperator: "contains",
        prevValue: ["item1"],
        newType: "String",
        newOperators: OPERATORS.String,
        newSchema: null,
      });

      expect(result.operator).toBe("contains");
      expect(result.valueReset).toBe(true);
    });

    it("newSchema=undefined treated as schemaless (backward compat)", () => {
      const result = resolveFilterTransition({
        prevType: "String",
        prevOperator: "contains",
        prevValue: "hello",
        newType: "String",
        newOperators: OPERATORS.String,
      });

      expect(result.operator).toBe("contains");
      expect(result.value).toBe("hello");
      expect(result.valueReset).toBe(false);
    });

    it("FIT-2275 gap 1: Number→Number different column id resets stale value", () => {
      const result = resolveFilterTransition({
        prevType: "Number",
        prevOperator: "greater",
        prevValue: 10,
        newType: "Number",
        newOperators: OPERATORS.Number,
        prevColumnId: "filter:tasks:total_annotations",
        newColumnId: "filter:tasks:id",
      });

      expect(result.operator).toBe("greater");
      expect(result.valueReset).toBe(true);
      expect(result.value).toBeUndefined();
    });

    it("FIT-2275 gap 1: same column id still preserves value for schemaless Number", () => {
      const result = resolveFilterTransition({
        prevType: "Number",
        prevOperator: "greater",
        prevValue: 10,
        newType: "Number",
        newOperators: OPERATORS.Number,
        prevColumnId: "filter:tasks:id",
        newColumnId: "filter:tasks:id",
      });

      expect(result.value).toBe(10);
      expect(result.valueReset).toBe(false);
    });
  });

  describe("FIT-2604 — stale between-operator on column switch / hydration", () => {
    const reviewsAcceptedId = "filter:annotations:reviews_accepted";
    const reviewsRejectedId = "filter:annotations:reviews_rejected";

    it("Date(is between) → reviews_accepted resets to equal", () => {
      const result = resolveFilterTransition({
        prevType: "Date",
        prevOperator: "in",
        prevValue: { min: "2026-01-01", max: "2026-03-01" },
        newType: "Number",
        newOperators: OPERATORS.Number,
        prevColumnId: "filter:annotations:commented_at",
        newColumnId: reviewsAcceptedId,
      });

      expect(result.operator).toBe("equal");
      expect(result.valueReset).toBe(true);
    });

    it("Number(is between) → different Number column resets to equal", () => {
      const result = resolveFilterTransition({
        prevType: "Number",
        prevOperator: "in",
        prevValue: { min: 1, max: 5 },
        newType: "Number",
        newOperators: OPERATORS.Number,
        prevColumnId: "filter:annotations:comment_count",
        newColumnId: reviewsRejectedId,
      });

      expect(result.operator).toBe("equal");
      expect(result.valueReset).toBe(true);
    });

    it("keeps valid top-level reviews_accepted between range on load", () => {
      const snapshot = recoverReviewIndicatorSnapshot({
        filter: reviewsAcceptedId,
        operator: "in",
        value: { min: 1, max: 3 },
      });

      expect(snapshot.operator).toBe("in");
      expect(snapshot.value).toEqual({ min: 1, max: 3 });
    });

    it("coerces broken reviews_accepted between snapshot (scalar value)", () => {
      const snapshot = recoverReviewIndicatorSnapshot({
        filter: reviewsAcceptedId,
        operator: "in",
        value: false,
      });

      expect(snapshot.operator).toBe("equal");
      expect(snapshot.value).toBe(false);
    });

    it("coerces broken reviews_rejected between snapshot (empty range)", () => {
      const snapshot = recoverReviewIndicatorSnapshot({
        filter: reviewsRejectedId,
        operator: "in",
        value: {},
      });

      expect(snapshot.operator).toBe("equal");
      expect(snapshot.value).toBe(false);
    });
  });
});
