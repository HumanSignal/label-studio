import { describe, expect, it } from "bun:test";
import { buildObjectDataTypes } from "../utils";

const pages = ["https://example.com/page-1.png", "https://example.com/page-2.png"];

describe("buildObjectDataTypes", () => {
  it("includes an Image that only has valuelist, resolved to the list of image URLs", () => {
    const multiPageImage = {
      isObjectTag: true,
      type: "image",
      value: null,
      valuelist: "$pages",
      multiImage: true,
      parsedValue: "",
      parsedValueList: pages,
    };

    expect(buildObjectDataTypes([["page", multiPageImage]])).toEqual({
      page: { type: "image", value: pages },
    });
  });

  it("resolves a single Image from value", () => {
    const image = {
      isObjectTag: true,
      type: "image",
      value: "$image",
      valuelist: null,
      multiImage: false,
      parsedValue: pages[0],
      parsedValueList: "",
    };

    expect(buildObjectDataTypes([["image", image]])).toEqual({
      image: { type: "image", value: pages[0] },
    });
  });

  it("skips object tags without a data binding or loaded data", () => {
    const staticText = { isObjectTag: true, type: "text", value: "static text", _value: "static text" };

    expect(buildObjectDataTypes([["static", staticText]])).toEqual({});
  });
});
