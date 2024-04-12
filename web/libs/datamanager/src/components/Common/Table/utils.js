export const prepareColumns = (columns, hidden) => {
  return columns.filter((col) => {
    return !(hidden ?? []).includes(col.id);
  });
};

export const getProperty = (object, path) => {
  try {
    const normalizedPath = path
      .split(".")
      .map((p) => `["${p}"]`)
      .join("");

    // eslint-disable-next-line no-new-func
    const fn = new Function("object", `return object${normalizedPath}`);

    return fn(object);
  } catch {
    return undefined;
  }
};

const resolveStyle = (col, decoration, cellView) => {
  const result = {};

  [cellView, decoration].forEach((item) => {
    const cellStyle = (item ?? {}).style;

    if (cellStyle instanceof Function) {
      Object.assign(result, cellStyle(col) ?? {});
    } else {
      Object.assign(result, cellStyle ?? {});
    }
  });

  return result ?? {};
};

export const getStyle = (cellViews, col, decoration) => {
  const cellView = cellViews?.[col.type];
  const style = { width: 150 };
  const resolvedStyle = resolveStyle(col, decoration, cellView);

  Object.assign(style, resolvedStyle, {
    width: col.width ?? resolvedStyle.width ?? 150,
  });

  return style;
};
