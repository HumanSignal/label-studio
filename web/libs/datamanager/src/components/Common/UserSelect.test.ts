import { describe, expect, it } from "bun:test";
import { getUserOptionLabel, summarizeSelectedUsers } from "./UserSelect";

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

describe("summarizeSelectedUsers (FIT-2394)", () => {
  it("returns placeholder when nothing is selected", () => {
    expect(summarizeSelectedUsers([], "Select annotators")).toEqual({
      primaryLabel: "Select annotators",
      overflowCount: 0,
    });
  });

  it("shows only the first display name with overflow for additional selections", () => {
    expect(
      summarizeSelectedUsers(
        [
          { raw: { displayName: "Matt One", email: "matt.one@example.test" } },
          { raw: { displayName: "Matt Two", email: "matt.two@example.test" } },
          { raw: { displayName: "Other User", email: "other@example.test" } },
        ],
        "Select annotators",
      ),
    ).toEqual({ primaryLabel: "Matt One", overflowCount: 2 });
  });
});
