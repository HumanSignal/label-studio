export const formDataToJPO = (formData) => {
  if ((formData instanceof FormData) === false) return formData;

  return Array.from(formData.entries()).reduce((res, [key, value]) => {
    return {...res, [key]: value};
  }, {});
};

export const unique = (list, expression = (a, b) => a === b) => {
  return list.reduce((res, item) => {
    const index = res.findIndex((elem) => expression(elem, item));
    if (index < 0) res.push(item);

    return res;
  }, []);
};

export const isDefined = (value) => {
  return value !== null && value !== undefined;
};

export const objectClean = (source) => {
  const cleanObject = Object.entries(source).filter((pair) => {
    return isDefined(pair[1]) && pair[1] !== "";
  }).map(([key, value]) => {
    if (Object.prototype.toString.call(value) === '[object Object]') {
      return [key, objectClean(value)];
    } else {
      return [key, value];
    }
  });

  return Object.fromEntries(cleanObject);
};

export const humanReadableNumber = (n) => {
  let result = n;

  const normalizeNumber = (n) => n.toFixed(1).replace(/.(0+)$/, '');

  if (n >= 1e3 && n < 1e6) {
    result = `${normalizeNumber(n / 1e3)}K`;
  } else if (n >= 1e6 && n < 1e9) {
    result = `${normalizeNumber(n / 1e6)}M`;
  } else if (n >= 1e9) {
    result = `${normalizeNumber(n / 1e9)}B`;
  }

  return result || null;
};

export const absoluteURL = (path = "") => {
  if (path.match(/^http/) || path.match(/^\/\//)) {
    return path;
  } else {
    return [
      APP_SETTINGS.hostname.replace(/([/]+)$/, ''),
      path.replace(/^([/]+)/, ''),
    ].join("/");
  }
};
