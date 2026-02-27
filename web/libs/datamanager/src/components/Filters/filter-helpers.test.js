import { filterFieldSearchHandler, findSelectedOption } from "./filter-helpers";

// ─── filterFieldSearchHandler ─────────────────────────────────────────────────

describe("filterFieldSearchHandler", () => {
  const headerOption = { original: { _isHeader: true, field: { title: "Recent" } } };
  const separatorOption = { original: { _isSeparator: true, field: { title: "" } } };
  const recentOption = { _isRecent: true, original: { field: { title: "Updated at" } } };
  const regularOption = { original: { field: { title: "Created at", parent: { title: "data" } } } };

  it("shows headers when query is empty", () => {
    expect(filterFieldSearchHandler(headerOption, "")).toBe(true);
  });

  it("hides headers when query is non-empty", () => {
    expect(filterFieldSearchHandler(headerOption, "some")).toBe(false);
  });

  it("shows separators when query is empty", () => {
    expect(filterFieldSearchHandler(separatorOption, "")).toBe(true);
  });

  it("hides separators when query is non-empty", () => {
    expect(filterFieldSearchHandler(separatorOption, "x")).toBe(false);
  });

  it("shows recent items when query is empty", () => {
    expect(filterFieldSearchHandler(recentOption, "")).toBe(true);
  });

  it("hides recent items when query is non-empty", () => {
    expect(filterFieldSearchHandler(recentOption, "updated")).toBe(false);
  });

  it("matches regular option by title (case-insensitive)", () => {
    expect(filterFieldSearchHandler(regularOption, "created")).toBe(true);
    expect(filterFieldSearchHandler(regularOption, "CREATED")).toBe(true);
  });

  it("matches regular option by parent title", () => {
    expect(filterFieldSearchHandler(regularOption, "data")).toBe(true);
  });

  it("returns false for non-matching query", () => {
    expect(filterFieldSearchHandler(regularOption, "zzz")).toBe(false);
  });

  it("handles options with missing nested fields", () => {
    expect(filterFieldSearchHandler({}, "")).toBe(true);
    expect(filterFieldSearchHandler({ original: {} }, "test")).toBe(false);
  });
});

// ─── findSelectedOption ───────────────────────────────────────────────────────

describe("findSelectedOption", () => {
  const flatItems = [
    { value: "filter:tasks:a", title: "A", _isRecent: true },
    { value: "filter:tasks:b", title: "B" },
  ];
  const groupedItems = [
    {
      id: "data",
      title: "Data",
      options: [
        { value: "filter:tasks:image", title: "Image" },
        { value: "filter:tasks:text", title: "Text" },
      ],
    },
    ...flatItems,
  ];

  it("finds a flat (recent) item by value", () => {
    const found = findSelectedOption(flatItems, "filter:tasks:a");
    expect(found).toEqual(flatItems[0]);
  });

  it("finds an item inside a group's options", () => {
    const found = findSelectedOption(groupedItems, "filter:tasks:image");
    expect(found.title).toBe("Image");
  });

  it("returns null when no match is found", () => {
    expect(findSelectedOption(groupedItems, "nonexistent")).toBeNull();
  });

  it("prefers grouped items that appear before flat items", () => {
    const mixed = [
      { id: "g", title: "Group", options: [{ value: "dup", title: "Group dup" }] },
      { value: "dup", title: "Flat dup", _isRecent: true },
    ];
    const found = findSelectedOption(mixed, "dup");
    expect(found.title).toBe("Group dup");
  });

  it("returns the first match when recent items come before groups", () => {
    const mixed = [
      { value: "dup", title: "Recent dup", _isRecent: true },
      { id: "g", title: "Group", options: [{ value: "dup", title: "Group dup" }] },
    ];
    const found = findSelectedOption(mixed, "dup");
    expect(found.title).toBe("Recent dup");
  });

  it("handles empty list", () => {
    expect(findSelectedOption([], "any")).toBeNull();
  });
});
