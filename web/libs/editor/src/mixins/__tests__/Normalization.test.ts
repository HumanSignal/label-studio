/**
 * Unit tests for NormalizationMixin (mixins/Normalization.ts)
 */
import { types } from "mobx-state-tree";
import NormalizationMixin from "../Normalization";

const TestModel = types.compose(NormalizationMixin);

describe("NormalizationMixin", () => {
  it("has default empty meta", () => {
    const model = TestModel.create({});
    expect(model.meta).toEqual({});
  });

  it("setMetaText sets meta.text to [text] when text is non-empty", () => {
    const model = TestModel.create({});
    model.setMetaText("hello");
    expect(model.meta).toEqual({ text: ["hello"] });
  });

  it("setMetaText overwrites existing meta.text", () => {
    const model = TestModel.create({});
    model.setMetaText("first");
    model.setMetaText("second");
    expect(model.meta).toEqual({ text: ["second"] });
  });

  it("setMetaText with empty string removes meta.text", () => {
    const model = TestModel.create({});
    model.setMetaText("hello");
    model.setMetaText("");
    expect(model.meta).toEqual({});
    expect(model.meta).not.toHaveProperty("text");
  });

  it("setMetaText with falsy removes meta.text", () => {
    const model = TestModel.create({});
    model.setMetaText("hello");
    // @ts-expect-error testing falsy path
    model.setMetaText(null);
    expect(model.meta).toEqual({});
  });

  it("deleteMetaText removes meta.text", () => {
    const model = TestModel.create({});
    model.setMetaText("to remove");
    model.deleteMetaText();
    expect(model.meta).toEqual({});
  });

  it("deleteMetaText is no-op when no meta.text", () => {
    const model = TestModel.create({});
    model.deleteMetaText();
    expect(model.meta).toEqual({});
  });
});
