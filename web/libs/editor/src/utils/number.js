import { isDefined } from "./utilities";

export const safeNumber = (v, fallback) => {
  const n = Number(v);
  return isDefined(v) && Number.isFinite(n) ? n : fallback;
};

export const positiveNumber = (v, fallback = 1) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
