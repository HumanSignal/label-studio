const valueToString = (value) => {
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    /* if undefined or null we'll treat it as empty string, otherwise toString(), this will allow 0 and false to render properly */
    return (value ?? "").toString();
  }
};

export const StringCell = ({ value }) => {
  return (
    <div
      style={{
        maxHeight: "100%",
        overflow: "hidden",
        fontSize: 12,
        lineHeight: "16px",
      }}
    >
      {valueToString(value)}
    </div>
  );
};
