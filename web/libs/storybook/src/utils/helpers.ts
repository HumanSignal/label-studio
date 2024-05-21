import chroma from "chroma-js";

declare global {
  interface Window {
    APP_SETTINGS: any;
  }
}

export const formDataToJPO = (formData: FormData) => {
  if (formData instanceof FormData) {
    const entries = formData.entries();

    return Array.from(entries).reduce((res, [key, value]) => {
      return { ...res, [key]: value };
    }, {});
  }

  return formData;
};

type Uniqueness<T> = (a: T, b: T) => boolean;

export const unique = <T>(list: T[] | undefined, expression: Uniqueness<T>): T[] => {
  const comparator = expression ?? ((a, b) => a === b);

  return (list ?? []).reduce<T[]>((res, item) => {
    const index = res.findIndex((elem) => comparator(elem, item));

    if (index < 0) res.push(item);

    return res;
  }, []);
};

export const isDefined = <T>(value: T | undefined | null): value is T => {
  return value !== null && value !== undefined;
};

export const isEmptyString = (value: any) => {
  if (!value) return true;
  if (typeof value === "string") return value.trim() === "";
  if (value.length === 0) return true;
  return false;
};

export const objectClean = <T extends AnyObject>(source: T) => {
  const cleanObject: [keyof T, unknown][] = Object.entries(source).reduce<[keyof T, unknown][]>((res, [key, value]) => {
    const valueIsDefined = isDefined(value) && !isEmptyString(value);

    if (!valueIsDefined) {
      return res;
    }

    if (Object.prototype.toString.call(value) === "[object Object]") {
      return [...res, [key, objectClean(value as AnyObject)]];
    }
    return [...res, [key, value]];
  }, []);

  return Object.fromEntries(cleanObject) as T;
};

export const numberWithPrecision = (n: number, precision = 1, removeTrailingZero = false) => {
  if (typeof n !== "number" || isNaN(n)) return "";

  let finalNum = n.toFixed(precision);

  if (removeTrailingZero) {
    finalNum = finalNum.replace(/.(0+)$/, "");
  }

  return finalNum;
};

export const humanReadableNumber = (n: number) => {
  const abs = Math.abs(n);

  if (isNaN(abs) || n === null) return "—";
  const normalizeNumber = (n: number) => numberWithPrecision(n, 1, true);

  let result;

  if (abs < 1e3) {
    result = normalizeNumber(n);
  } else if (abs >= 1e3 && abs < 1e6) {
    result = `${normalizeNumber(n / 1e3)}K`;
  } else if (abs >= 1e6 && abs < 1e9) {
    result = `${normalizeNumber(n / 1e6)}M`;
  } else {
    result = `${normalizeNumber(n / 1e9)}B`;
  }

  return result || null;
};

export const absoluteURL = (path = "") => {
  if (path.match(/^https?/) || path.match(/^\/\//)) {
    return path;
  }
  return [APP_SETTINGS.hostname.replace(/([/]+)$/, ""), path.replace(/^([/]+)/, "")].join("/");
};

export const removePrefix = (path: string) => {
  if (APP_SETTINGS.hostname) {
    const hostname = APP_SETTINGS.hostname;
    const prefix = new URL(hostname).pathname.replace(/([/]+)$/, "");

    return path.replace(new RegExp(`^${prefix}`), "");
  }

  return path || "/";
};

export const copyText = (text: string) => {
  const input = document.createElement("textarea");

  input.style.position = "fixed"; // don't mess up with scroll
  document.body.appendChild(input);

  input.value = text;
  input.focus();
  input.select();

  document.execCommand("copy");
  input.remove();
};

export const userDisplayName = (user: APIUserFull) => {
  const firstName = user?.first_name;
  const lastName = user?.last_name;

  return firstName || lastName
    ? [firstName, lastName]
        .filter((n) => !!n)
        .join(" ")
        .trim()
    : user?.username ?? user?.email ?? "";
};

export const chunks = <T extends any[]>(source: T, chunkSize: number) => {
  const result = [];
  let i;
  let j;

  for (i = 0, j = source.length; i < j; i += chunkSize) {
    result.push(source.slice(i, i + chunkSize));
  }

  return result as T[];
};

export const avg = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / nums.length;

export const stringToColor = (str: string) => {
  const chars = [...btoa(str)].map<number>((c) => c.charCodeAt(0));
  const numPerChunk = Math.ceil(chars.length / 3);
  const channels = chunks(chars, numPerChunk);

  if (channels.length < 3) {
    const padding = new Array(3 - channels.length);

    padding.fill([0]);
    channels.push(padding);
  }

  const color = channels.map((chunk) => {
    const padding = new Array(numPerChunk - chunk.length);

    if (padding.length > 0) {
      padding.fill(0);
      chunk.push(...padding);
    }

    return Math.round(avg(chunk));
  });

  return chroma(`rgb(${color})`);
};

export const reverseMap = <T extends Record<string, any[]>>(source: T): T => {
  const reversed = Object.entries(source).map((ent) => ent.reverse());

  return Object.fromEntries(reversed);
};

export const arrayClean = <T extends []>(source: T) => {
  return source.reduce((res, value) => {
    if (value) res.push(value);

    return res;
  }, []);
};

export const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(value, max));
};

export const dispatchReactEvent = <T extends HTMLElement>(elem: T, eventName: string, value?: any) => {
  const elementTypeName = Object.prototype.toString.call(elem).replace(/^\[object |\]$/g, "");
  const elementType = window[elementTypeName as keyof Window]?.prototype;

  const trigger = Object.getOwnPropertyDescriptor(elementType, "value")?.set;

  if (trigger && value) trigger.call(elem, value);
  const event = new Event(eventName, { bubbles: true, cancelable: false });

  elem.dispatchEvent(event);
};

export const getLastTraceback = (traceback: string): string => {
  const lines = traceback.split("\n");
  let lastTraceIndex = -1;

  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].startsWith("  File")) {
      lastTraceIndex = i;
      break;
    }
  }

  return lastTraceIndex >= 0 ? lines.slice(lastTraceIndex).join("\n") : traceback;
};

export const countDecimals = (value: number) => {
  if (Math.floor(value) === value) return 0;

  return value.toString().split(".")[1].length || 0;
};

/**
 * Returns the singular or plural form of a word based on the given count.
 *
 * @param {number} count - The count to determine the form of the word.
 * @param {string} singular - The singular form of the word.
 * @param {string} plural - The plural form of the word.
 * @return {string} - The singular or plural form of the word based on the count.
 */
export function pluralize(count: number, singular: string, plural: string) {
  if (count === 1) {
    return singular;
  }
  return plural;
}

export const isFlagEnabled = (id: string, flagList: Record<string, boolean>, defaultValue = false) => {
  if (id in flagList) {
    return flagList[id] === true;
  }
  return defaultValue;
};

export const sum = (values: any[]) => {
  const cleanValues = values.map((v) => (typeof v === "string" ? Number.parseFloat(v) : v));

  if (cleanValues.some((v) => isNaN(v))) return Number.NaN;
  return cleanValues.reduce((a, b) => a + b, 0);
};

export const average = (values: any[]) => {
  const cleanValues = values.map((v) => (typeof v === "string" ? Number.parseFloat(v) : v));

  if (cleanValues.some((v) => isNaN(v))) return Number.NaN;
  return sum(cleanValues) / cleanValues.length;
};

export const median = (values: any[]) => {
  const cleanValues = values.map((v) => (typeof v === "string" ? Number.parseFloat(v) : v));

  if (cleanValues.some((v) => isNaN(v))) return Number.NaN;
  cleanValues.sort((a, b) => a - b);
  const lowMiddle = Math.floor((cleanValues.length - 1) / 2);
  const highMiddle = Math.ceil((cleanValues.length - 1) / 2);
  const lowMidValue = cleanValues[lowMiddle];
  const highMiddleValue = cleanValues[highMiddle];

  return (lowMidValue + highMiddleValue) / 2;
};

/**
 * Check if the string is base64 encoded.
 */
export function isBase64(str: string): boolean {
  try {
    return btoa(atob(str)) === str;
  } catch {
    return false;
  }
}

/**
 * Decode the string from base64 if it is base64 encoded.
 * Otherwise, return the string as is.
 */
export function base64Decode(str: string): string {
  if (!isBase64(str)) return str;
  return atob(str);
}
