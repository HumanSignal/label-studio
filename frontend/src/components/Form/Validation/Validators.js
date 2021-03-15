import './Validation.styl';

const isEmptyString = (value) => {
  return typeof value === 'string' && value.trim() === "";
};

const isDefined = (value) => {
  return value !== undefined && value !== null;
};

export const required = (fieldName, value) => {
  if (!isDefined(value) || isEmptyString(value)) {
    return `${fieldName} is required`;
  }
};

export const matchPattern = (pattern) => (fieldName, value) => {
  if (!isEmptyString(value) && value.match(pattern) === null) {
    return `${fieldName} should match pattern ${pattern}`;
  }
};
