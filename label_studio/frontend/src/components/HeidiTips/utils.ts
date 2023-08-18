import { TipsCollection } from "./content";
import { Tip } from "./types";

const STORE_KEY = "heidi_ignored_tips";

function getKey(collection: string) {
  return `${STORE_KEY}:${collection}`
}

function getRandomIndex(
  maxIndex: number,
  ignoredIndexes: number[],
): number | null {
  if (ignoredIndexes.length === maxIndex + 1) return null;

  const index = Math.floor(Math.random() * maxIndex + 1);

  if (ignoredIndexes.includes(index)) {
    return getRandomIndex(maxIndex, ignoredIndexes);
  }

  return index;
}

export function getRandomTip(collection: keyof typeof TipsCollection): { index: number, tip: Tip } | null {
  const tips = TipsCollection[collection];
  const ignored = getIgnoredTips(collection)

  const index = getRandomIndex(tips.length - 1, ignored);

  if (index === null) return null;

  const tip = tips[index];

  return { index, tip };
}

function getIgnoredTips(collection: string) {
  const finalKey = getKey(collection);
  return JSON.parse(localStorage.getItem(finalKey) ?? "[]");
}

export function dismissTip(collection: string, index: number) {
  const finalKey = getKey(collection);
  const list = JSON.parse(localStorage.getItem(finalKey) ?? "[]");
  localStorage.setItem(finalKey, JSON.stringify([...list, index]));
}

export function isTipDismissed(collection: string, index: number) {
  const finalKey = getKey(collection);
  const list = JSON.parse(localStorage.getItem(finalKey) ?? "[]");
  return list.includes(index);
}
