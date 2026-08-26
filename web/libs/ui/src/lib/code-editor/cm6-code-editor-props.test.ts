import { pickCm6WrapperProps } from "./cm6-code-editor-props";

describe("cm6-code-editor-props", () => {
  it("strips CM5-only props including extensions hint addons", () => {
    const result = pickCm6WrapperProps({
      extensions: ["hint", "xml-hint"],
      detach: true,
      autoCloseTags: true,
      id: "edit_code",
      name: "code",
      "data-testid": "labeling-config",
    });

    expect(result).toEqual({
      id: "edit_code",
      name: "code",
      "data-testid": "labeling-config",
    });
  });
});
