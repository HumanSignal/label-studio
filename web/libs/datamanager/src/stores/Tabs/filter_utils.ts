interface Formatter {
  [key: string]: (operator: string, value: any) => any;
}

// Range operators (between / not between) — value is `{min, max}`.
// The original regex `/^in|not_in$/` is `(^in)|(not_in$)`, which also
// matches `in_list` and `not_in_list` (BROS-1203) and would Object.entries
// an array into `{0: …, 1: …}` — i.e. a non-list payload the BE rejects.
const RANGE_OPS = /^(in|not_in)$/;

const filterFormatters: Formatter = {
  Number: (op, value) => {
    // List membership (BROS-1203): coerce each element, drop non-finite tokens.
    if (Array.isArray(value)) {
      return value.map((v) => Number(v)).filter((v) => Number.isFinite(v));
    }
    if (RANGE_OPS.test(op)) {
      const result = Object.entries(value).map(([key, value]) => {
        return [key, Number(value)];
      });

      return Object.fromEntries(result);
    }

    return Number(value);
  },
  String: (op, value) => {
    if (Array.isArray(value)) {
      return value.map((v) => String(v));
    }
    if (RANGE_OPS.test(op)) {
      const result = Object.entries(value).map(([key, value]) => {
        return [key, String(value)];
      });

      return Object.fromEntries(result);
    }

    return String(value);
  },
};

export const normalizeFilterValue = (type: string, op: string, value: any) => {
  const formatter = filterFormatters[type];

  return formatter ? formatter(op, value) : value;
};
