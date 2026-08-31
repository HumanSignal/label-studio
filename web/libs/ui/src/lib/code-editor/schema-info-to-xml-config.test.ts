import tags from "@humansignal/core/lib/utils/schema/tags.json";
import { schemaInfoToXmlConfig } from "./schema-info-to-xml-config";

describe("schemaInfoToXmlConfig", () => {
  it("maps View as top-level element with children", () => {
    const { elements } = schemaInfoToXmlConfig(tags);

    const view = elements.find((element) => element.name === "View");
    expect(view?.top).toBe(true);
    expect(view?.children).toContain("Text");
    expect(view?.children).toContain("View");
  });

  it("maps attribute types and required markers", () => {
    const schema = {
      View: {
        name: "View",
        description: "Root view",
        attrs: {
          display: {
            name: "display",
            type: ["block", "inline"],
            required: true,
          },
          style: {
            name: "style",
            type: "string",
            required: false,
            description: "CSS style",
          },
        },
        children: ["Text"],
      },
      Text: {
        name: "Text",
        description: "Text block",
        attrs: {
          name: {
            name: "name",
            type: "string",
            required: true,
          },
        },
      },
    };

    const { elements } = schemaInfoToXmlConfig(schema);
    const view = elements.find((element) => element.name === "View");
    const displayAttr = view?.attributes?.find((attr) => typeof attr !== "string" && attr.name === "display");

    expect(displayAttr && typeof displayAttr !== "string").toBe(true);
    if (displayAttr && typeof displayAttr !== "string") {
      expect(displayAttr.values).toEqual(["block", "inline"]);
      expect(displayAttr.completion?.label).toBe("display*");
      expect(displayAttr.completion?.apply).toBe("display");
    }
  });

  it("skips !attrs sentinel key", () => {
    const { elements } = schemaInfoToXmlConfig({
      "!attrs": { name: "!attrs" } as never,
      View: { name: "View" },
    });

    expect(elements.some((element) => element.name === "!attrs")).toBe(false);
  });
});
