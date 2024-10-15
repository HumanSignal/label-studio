interface Formatter {
  [key: string]: (operator: string, value: any) => any;
}

const filterFormatters: Formatter = {
  Number: (op, value) => {
    if (op.match(/^in|not_in$/)) {
      const result = Object.entries(value).map(([key, value]) => {
        return [key, Number(value)];
      });

      return Object.fromEntries(result);
    }

    return Number(value);
  },
  String: (op, value) => {
    if (op.match(/^in|not_in$/)) {
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
