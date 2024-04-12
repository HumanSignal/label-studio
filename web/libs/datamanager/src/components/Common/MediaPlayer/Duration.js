export const Duration = ({ value, format }) => {
  if (value === Number.POSITIVE_INFINITY) {
    return "Unknown";
  }
  const formatted = new Date(value * 1000).toISOString().substr(11, 8);

  const parsed = formatted.split(":");

  const result = format.map((unit) => {
    switch (unit) {
      case "hours":
        return parsed[0];
      case "minutes":
        return parsed[1];
      case "seconds":
        return parsed[2];
    }
  });

  return result.join(":");
};
