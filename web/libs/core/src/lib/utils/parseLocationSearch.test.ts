import { describe, expect, it } from "bun:test";
import { parseLocationSearch } from "./parseLocationSearch";

describe("parseLocationSearch", () => {
  it("returns an empty object for a missing or empty search string", () => {
    expect(parseLocationSearch(undefined)).toEqual({});
    expect(parseLocationSearch("")).toEqual({});
    expect(parseLocationSearch("?")).toEqual({});
  });

  it("decodes spaces that URLSearchParams encodes as plus", () => {
    const payload = { value: '"has_image_content": false' };
    const search = `?${new URLSearchParams({ query: JSON.stringify(payload) }).toString()}`;

    expect(search).toContain("+");
    expect(JSON.parse(parseLocationSearch(search).query).value).toBe('"has_image_content": false');
  });

  it("does not treat decodeURIComponent as sufficient for plus-encoded spaces", () => {
    const payload = { value: '"has_image_content": false' };
    const encoded = new URLSearchParams({ query: JSON.stringify(payload) }).toString();
    const pair = encoded.split("&")[0];
    const broken = pair.split("=").map((part) => decodeURIComponent(part))[1];

    expect(JSON.parse(broken).value).toBe('"has_image_content":+false');
    expect(JSON.parse(parseLocationSearch(`?${encoded}`).query).value).toBe('"has_image_content": false');
  });
});
