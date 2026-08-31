import { types } from "mobx-state-tree";
import { isValidElement } from "react";

export const CustomJSON = types.custom({
  name: "JSON",
  toSnapshot(value) {
    return JSON.stringify(value);
  },
  fromSnapshot(value) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  },
  isTargetType(value) {
    return typeof value === "object" || typeof value === "string";
  },
  getValidationMessage() {
    return "Error parsing JSON";
  },
});

export const StringOrNumber = types.union(types.string, types.number);

// Try numeric identifiers first so API JSON numeric ids (e.g. task id, user id) validate.
export const StringOrNumberID = types.union(types.identifierNumber, types.identifier);

export const CustomCalback = types.custom({
  name: "callback",
  toSnapshot(value) {
    return value;
  },
  fromSnapshot(value) {
    return value;
  },
  isTargetType(value) {
    return typeof value === "function";
  },
  getValidationMessage() {
    return "is not a function";
  },
});

export const HtmlOrReact = types.custom({
  name: "validElement",
  toSnapshot(value) {
    return value;
  },
  fromSnapshot(value) {
    return value;
  },
  isTargetType(value) {
    return isValidElement(value);
  },
  getValidationMessage() {
    return "is not a valid element";
  },
});

export const ThresholdType = types.model("ThresholdType", {
  min: types.maybeNull(types.number),
  max: types.maybeNull(types.number),
});
