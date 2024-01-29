const valueToString = (value) => {
  if (typeof value === "string") return value;
  /* if undefined or null we'll treat it as empty string */
  if (value === undefined || value === null) return "";

  try {
    /* JSON.stringify will handle JSON and non-strings, non-null, non-undefined */
    return JSON.stringify(value);
  } catch {
    return 'Error: Invalid JSON';
  }
};

export const StringCell = ({ value }) => {
  const style = {
    maxHeight: "100%",
    overflow: "hidden",
    fontSize: 12,
    lineHeight: "16px",
  };

  return (
    <div style={style}>
      {valueToString(value)}
    </div>
  );
};
