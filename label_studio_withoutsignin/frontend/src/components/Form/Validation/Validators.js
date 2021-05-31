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
