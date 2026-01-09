export const isFlagEnabled = (id: string, flagList: Record<string, boolean>, defaultValue = false) => {
  if (id in flagList) {
    return flagList[id] ?? defaultValue;
  }
  return defaultValue;
};

export const formDataToJPO = (formData: FormData) => {
  if (formData instanceof FormData) {
    return Object.fromEntries(formData.entries());
  }

  return formData;
};

export const isDefined = <T>(value: T | undefined | null): value is T => {
  return value !== null && value !== undefined;
};

export const userDisplayName = (user: Record<string, string> = {}) => {
  if (!user) return "";
  let { firstName, lastName, first_name, last_name, username, email } = user;

  if (first_name) {
    firstName = first_name;
  }
  if (last_name) {
    lastName = last_name;
  }

  return firstName || lastName
    ? [firstName, lastName]
        .filter((n) => !!n)
        .join(" ")
        .trim()
    : username || email;
};

export const copyText = async (text: string) => {
  await navigator.clipboard.writeText(text);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

/**
 * Formats seconds into a human-readable time string.
 * Format: [n]h [n]m [n]s (omitting zero-value components)
 * Examples:
 *   36922 -> "10h 15m 22s"
 *   322   -> "5m 22s"
 *   45    -> "45s"
 *   3600  -> "1h"
 *   0     -> ""
 */
export const formatTime = (totalSeconds: number): string => {
  const seconds = Math.floor(totalSeconds);

  if (seconds <= 0) {
    return "";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (secs > 0) {
    parts.push(`${secs}s`);
  }

  return parts.join(" ");
};
