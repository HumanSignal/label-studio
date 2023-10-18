const valueToString = (value) => {
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return value.toString();
  }
};

export const TextDataGroup = ({ value }) => {
  return (
    <div
      style={{ padding: 5, height: TextDataGroup.height, overflow: "hidden" }}
    >
      {value ? valueToString(value) : ""}
    </div>
  );
};

TextDataGroup.height = 77;
