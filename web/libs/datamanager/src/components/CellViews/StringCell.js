const valueToString = (value) => {
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return value.toString();
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
      {value ? valueToString(value) : ""}
    </div>
  );
};
