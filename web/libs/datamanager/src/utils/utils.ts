/**
 * @todo use [].every()
 * Returns true if all checks return true
 * @param {boolean[]} boolArray
 * @param {(any) => boolean} check
 */
export const all = <T>(boolArray: T[], check: (item: T) => boolean) => {
  return boolArray.reduce((res, value) => {
    return res && !!check(value);
  }, true);
};

/**
 * Returns true if any of the checks return true
 * @param {boolean[]} boolArray
 * @param {(any) => boolean} check
 */
export const any = <T>(boolArray: T[], check: (item: T) => boolean) => {
  return boolArray.find((value) => !!check(value)) || false;
};

export const randomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

export const groupBy = <T>(list: T[], group: (item: T) => string) => {
  return list.reduce<Record<string, T[]>>((res, item) => {
    const property = group(item);

    if (res[property]) {
      res[property].push(item);
    } else {
      res[property] = [item];
    }

    return res;
  }, {});
};

export const unique = <T>(list: T[]): T[] => {
  return Array.from(new Set<T>(list));
};

export const cleanArray = <T>(array: T[]): T[] => {
  return array.filter((el) => !!el);
};

export const isDefined = <T>(value?: T): value is T => {
  return value !== null && value !== undefined;
};

export const isBlank = (value?: string) => {
  if (!isDefined(value)) return true;

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  return false;
};
