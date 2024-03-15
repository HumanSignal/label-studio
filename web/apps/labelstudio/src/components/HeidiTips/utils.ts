import { TipsCollection } from "./content";
import type { Tip } from "./types";

const STORE_KEY = "heidi_ignored_tips";

function getKey(collection: string) {
  return `${STORE_KEY}:${collection}`;
}

export function getRandomTip(collection: keyof typeof TipsCollection): Tip | null {
  if (isTipDismissed(collection)) return null;

  const tips = TipsCollection[collection];

  const index = Math.floor(Math.random() * tips.length);

  return tips[index];
}

/**
 * Set a cookie that indicates that a collection of tips is dismissed
 * for 30 days
 */
export function dismissTip(collection: string) {
  // will expire in 30 days
  const cookieExpiryTime = 1000 * 60 * 60 * 24 * 30;
  const cookieExpiryDate = new Date();

  cookieExpiryDate.setTime(cookieExpiryDate.getTime() + cookieExpiryTime);

  const finalKey = getKey(collection);
  const cookieValue = `${finalKey}=true`;
  const cookieExpiry = `expires=${cookieExpiryDate.toUTCString()}`;
  const cookiePath = "path=/";
  const cookieString = [cookieValue, cookieExpiry, cookiePath].join("; ");

  document.cookie = cookieString;
}

export function isTipDismissed(collection: string) {
  const cookies = Object.fromEntries(document.cookie.split(";").map((item) => item.trim().split("=")));
  const finalKey = getKey(collection);

  return cookies[finalKey] === "true";
}

export function createURL(url: string, params?: Record<string, string>): string {
  const base = new URL(url);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    base.searchParams.set(key, value);
  });

  const userID = APP_SETTINGS.user?.id;
  const serverID = APP_SETTINGS.server_id;

  if (serverID) base.searchParams.set("server_id", serverID);
  if (userID) base.searchParams.set("user_id", userID);

  return base.toString();
}
