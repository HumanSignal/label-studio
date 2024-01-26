import { Tooltip } from "../Common/Tooltip/Tooltip";

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

  return (
    <Tooltip title={output}>
      <div
        style={{ padding: 5, height: TextDataGroup.height, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
      >
        {output}
      </div>
    </Tooltip>
  );
};

TextDataGroup.height = 32;
