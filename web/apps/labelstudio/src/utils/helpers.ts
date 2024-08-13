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
  return typeof value === "string" && value.trim() === "";
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

export const numberWithPrecision = (n: number, precision = 1, removeTrailinZero = false) => {
  if (typeof n !== "number" || isNaN(n)) return "";

  let finalNum = n.toFixed(precision);

  if (removeTrailinZero) {
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

export const delay = (time = 0) => {
  return new Promise((resolve) => setTimeout(resolve, time));
};

export const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(value, max));
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

export const isFlagEnabled = (id: string, flagList: Record<string, boolean>, defaultValue = false) => {
  if (id in flagList) {
    return flagList[id] === true ?? defaultValue;
  }
  return defaultValue;
};
