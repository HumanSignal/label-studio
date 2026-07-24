import { describe, expect, it } from "bun:test";
import { getUserOptionLabel } from "./UserSelect";

describe("Data Manager user option labels", () => {
  it("includes email when it disambiguates a display name", () => {
    expect(getUserOptionLabel({ email: "sdk-annotator-42@example.com" }, "SDK Annotator")).toBe(
      "SDK Annotator (sdk-annotator-42@example.com)",
    );
  });

  it("does not repeat an email already used as the display name", () => {
    expect(getUserOptionLabel({ email: "member@example.com" }, "member@example.com")).toBe("member@example.com");
  });
});
