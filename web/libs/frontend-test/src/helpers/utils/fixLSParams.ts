/**
 * This function will fix LabelStudio parameters
 * as parameters created in cypress tests are not considered as plain objects by MST as it has it's own Object and Object.prototype is uniq as well
 */
export function fixLSParams(params: Record<string, any>, win: Window): Record<string, any> {
  if (Array.isArray(params)) {
    return win.Array.from(params.map((val) => fixLSParams(val, win)));
  }
  if (typeof params === "object") {
    return win.Object.assign(new win.Object(), {
      ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, fixLSParams(value, win)])),
    });
  }
  return params;
}
