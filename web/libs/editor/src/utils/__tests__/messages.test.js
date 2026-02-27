/**
 * Unit tests for utils/messages (Codecov: messages -7.69% delta).
 */
import Messages from "../messages";

describe("messages", () => {
  it("exposes string constants", () => {
    expect(Messages.DONE).toBe("Done!");
    expect(Messages.NO_COMP_LEFT).toBe("No more annotations");
    expect(Messages.NO_ACCESS).toBe("You don't have access to this task");
    expect(Messages.URL_CORS_DOCS).toContain("labelstud.io");
    expect(Messages.URL_TAGS_DOCS).toContain("labelstud.io");
  });

  it("ERR_REQUIRED returns message with modelName and field", () => {
    const msg = Messages.ERR_REQUIRED({ modelName: "Image", field: "value" });
    expect(msg).toContain("value");
    expect(msg).toContain("Image");
  });

  it("ERR_TAG_NOT_FOUND returns message with tag and reference", () => {
    const msg = Messages.ERR_TAG_NOT_FOUND({ modelName: "Labels", field: "toName", value: "img" });
    expect(msg).toContain("img");
    expect(msg).toContain("Labels");
  });

  it("ERR_TAG_UNSUPPORTED joins validType array", () => {
    const msg = Messages.ERR_TAG_UNSUPPORTED({
      modelName: "Labels",
      field: "toName",
      value: "x",
      validType: ["image", "text"],
    });
    expect(msg).toContain("image");
    expect(msg).toContain("text");
  });

  it("ERR_PARENT_TAG_UNEXPECTED joins validType", () => {
    const msg = Messages.ERR_PARENT_TAG_UNEXPECTED({ validType: ["View"], value: "Label" });
    expect(msg).toContain("View");
    expect(msg).toContain("Label");
  });

  it("ERR_GENERAL returns value", () => {
    expect(Messages.ERR_GENERAL({ value: "custom error" })).toBe("custom error");
  });

  it("ERR_INTERNAL includes value in message", () => {
    const msg = Messages.ERR_INTERNAL({ value: "TypeError" });
    expect(msg).toContain("TypeError");
  });

  it("ERR_LOADING_S3 returns string with attr and url", () => {
    const msg = Messages.ERR_LOADING_S3({ attr: "audio", url: "https://example.com/file.mp3" });
    expect(msg).toContain("audio");
    expect(msg).toContain("example.com");
  });
});
