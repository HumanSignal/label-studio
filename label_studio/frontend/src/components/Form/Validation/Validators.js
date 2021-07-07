import { isDefined, isEmptyString } from '../../../utils/helpers';
import './Validation.styl';


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

export const json = (fieldName, value) => {
  const err = `${fieldName} should be valid JSON string`;

  if (typeof value !== 'string') {
    console.log("value is not a string", value);
    return err;
  }

  if (/^(\{|\[)/.test(value) === false || /(\}|\])$/.test(value) === false) {
    console.log("value does not contain JSON signature", value);
    return err;
  }

  try {
    JSON.parse(value);
  } catch (e) {
    return err;
  }
};
