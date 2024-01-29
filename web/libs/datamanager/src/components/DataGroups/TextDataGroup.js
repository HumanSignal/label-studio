const valueToString = (value) => {
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return (value ?? "").toString();
  }
};

export const TextDataGroup = ({ value }) => {
  const output = valueToString(value);
  const style = { 
    padding: 5, 
    height: TextDataGroup.height, 
    overflow: "hidden", 
    whiteSpace: "nowrap", 
    textOverflow: "ellipsis",
  };

  return (
    <div style={style} title={output}>
      {output}
    </div>
  );
};

TextDataGroup.height = 32;
