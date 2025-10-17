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
