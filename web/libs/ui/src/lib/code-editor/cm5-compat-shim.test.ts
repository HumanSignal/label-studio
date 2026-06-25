import tags from "@humansignal/core/lib/utils/schema/tags.json";
import { buildCm6Extensions } from "./cm5-compat-shim";

describe("buildCm6Extensions XML parity", () => {
  it("includes syntax highlighting and search keymap for all modes", () => {
    const extensions = buildCm6Extensions({ mode: "javascript", lineNumbers: true });
    expect(extensions.length).toBeGreaterThan(3);
  });

  it("builds xml language with schema autocomplete extensions", () => {
    const extensions = buildCm6Extensions(
      {
        mode: "xml",
        lineNumbers: true,
        hintOptions: { schemaInfo: tags },
      },
      { autoCloseTags: true },
    );

    // theme + highlight + xml language + autocomplete UI + trigger keymap + completion keymap + search + lineNumbers + compartments
    expect(extensions.length).toBeGreaterThanOrEqual(8);
  });

  it("builds lightweight xml extensions for large documents", () => {
    const largeExtensions = buildCm6Extensions(
      { mode: "xml", lineNumbers: true, hintOptions: { schemaInfo: tags } },
      { autoCloseTags: true, lightweight: true },
    );
    const fullExtensions = buildCm6Extensions(
      { mode: "xml", lineNumbers: true, hintOptions: { schemaInfo: tags } },
      { autoCloseTags: true, lightweight: false },
    );

    expect(largeExtensions.length).toBeLessThan(fullExtensions.length);
  });
});
