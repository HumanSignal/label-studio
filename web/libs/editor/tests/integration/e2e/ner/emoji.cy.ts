import { Labels, LabelStudio } from "@humansignal/frontend-test/helpers/LSF";
import { RichText } from "@humansignal/frontend-test/helpers/LSF/RichText";
import { FF_LSDV_4620_3 } from "../../../../src/utils/feature-flags";
import {
  multilineTextData,
  simpleHyperTextConfig,
  simpleHyperTextData,
  simpleTextConfig,
  simpleTextData,
} from "../../data/ner/emoji";

describe("NER - Emoji - Text", () => {
  const refTextResultValue = {
    start: 21,
    end: 25,
    text: "test",
  };

  it("Should calculate offsets by code points in text (previous version)", () => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      [FF_LSDV_4620_3]: false,
    });
    LabelStudio.params().config(simpleTextConfig).data(simpleTextData).withResult([]).init();
    LabelStudio.waitForObjectsReady();
    Labels.select("region");
    RichText.selectText("test");
    RichText.hasRegionWithText("test");
    LabelStudio.serialize().then((results) => {
      const resultValue = results[0].value;
      expect(resultValue.start).to.eq(refTextResultValue.start);
      expect(resultValue.end).to.eq(refTextResultValue.end);
      expect(resultValue.text).to.eq(refTextResultValue.text);

      LabelStudio.params().config(simpleTextConfig).data(simpleTextData).withResult(results).init();
      LabelStudio.waitForObjectsReady();
      RichText.hasRegionWithText("test");

      LabelStudio.serialize().then((results) => {
        const resultValue = results[0].value;
        expect(resultValue.start).to.eq(refTextResultValue.start);
        expect(resultValue.end).to.eq(refTextResultValue.end);
        expect(resultValue.text).to.eq(refTextResultValue.text);
      });
    });
  });

  it("Should calculate offsets by code points in text", () => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      [FF_LSDV_4620_3]: true,
    });
    LabelStudio.params().config(simpleTextConfig).data(simpleTextData).withResult([]).init();
    LabelStudio.waitForObjectsReady();
    Labels.select("region");
    RichText.selectText("test");
    RichText.hasRegionWithText("test");
    LabelStudio.serialize().then((results) => {
      const resultValue = results[0].value;
      expect(resultValue.start).to.eq(refTextResultValue.start);
      expect(resultValue.end).to.eq(refTextResultValue.end);
      expect(resultValue.text).to.eq(refTextResultValue.text);

      LabelStudio.params().config(simpleTextConfig).data(simpleTextData).withResult(results).init();
      LabelStudio.waitForObjectsReady();
      RichText.hasRegionWithText("test");

      LabelStudio.serialize().then((results) => {
        const resultValue = results[0].value;
        expect(resultValue.start).to.eq(refTextResultValue.start);
        expect(resultValue.end).to.eq(refTextResultValue.end);
        expect(resultValue.text).to.eq(refTextResultValue.text);
      });
    });
  });

  const refMultilineTextResultValue = {
    start: 2,
    end: 27,
    text: "Warning:\\n🐱 This is a test",
  };

  it("Should calculate offsets by code points in multiline text (previous version)", () => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      [FF_LSDV_4620_3]: false,
    });
    LabelStudio.params().config(simpleTextConfig).data(multilineTextData).withResult([]).init();
    LabelStudio.waitForObjectsReady();
    Labels.select("region");
    RichText.selectBetweenTexts("Warning", "test");
    RichText.hasRegionWithText("Warning:");
    RichText.hasRegionWithText("🐱 This is a test");
    LabelStudio.serialize().then((results) => {
      const resultValue = results[0].value;
      expect(resultValue.start).to.eq(refMultilineTextResultValue.start);
      expect(resultValue.end).to.eq(refMultilineTextResultValue.end);
      expect(resultValue.text).to.eq(refMultilineTextResultValue.text);

      LabelStudio.params().config(simpleTextConfig).data(multilineTextData).withResult(results).init();
      LabelStudio.waitForObjectsReady();
      RichText.hasRegionWithText("Warning:");
      RichText.hasRegionWithText("🐱 This is a test");

      LabelStudio.serialize().then((results) => {
        const resultValue = results[0].value;
        expect(resultValue.start).to.eq(refMultilineTextResultValue.start);
        expect(resultValue.end).to.eq(refMultilineTextResultValue.end);
        expect(resultValue.text).to.eq(refMultilineTextResultValue.text);
      });
    });
  });

  it("Should calculate offsets by code points in multiline text", () => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      [FF_LSDV_4620_3]: true,
    });
    LabelStudio.params().config(simpleTextConfig).data(multilineTextData).withResult([]).init();
    LabelStudio.waitForObjectsReady();
    Labels.select("region");
    RichText.selectBetweenTexts("Warning", "test");
    RichText.hasRegionWithText("Warning:");
    RichText.hasRegionWithText("🐱 This is a test");
    LabelStudio.serialize().then((results) => {
      const resultValue = results[0].value;
      expect(resultValue.start).to.eq(refMultilineTextResultValue.start);
      expect(resultValue.end).to.eq(refMultilineTextResultValue.end);
      expect(resultValue.text).to.eq(refMultilineTextResultValue.text);

      LabelStudio.params().config(simpleTextConfig).data(multilineTextData).withResult(results).init();
      LabelStudio.waitForObjectsReady();
      RichText.hasRegionWithText("Warning:");
      RichText.hasRegionWithText("🐱 This is a test");

      LabelStudio.serialize().then((results) => {
        const resultValue = results[0].value;
        expect(resultValue.start).to.eq(refMultilineTextResultValue.start);
        expect(resultValue.end).to.eq(refMultilineTextResultValue.end);
        expect(resultValue.text).to.eq(refMultilineTextResultValue.text);
      });
    });
  });

  const refHyperTextResultValue = {
    start: "/article[1]/p[1]/text()[1]",
    end: "/article[1]/p[1]/text()[1]",
    text: "test",
    globalOffsets: {
      start: 23,
      end: 27,
    },
    startOffset: 13,
    endOffset: 17,
  };

  it("Should calculate global offsets by code points and relative offsets by string length in hypertext (previous version)", () => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      [FF_LSDV_4620_3]: false,
    });
    LabelStudio.params().config(simpleHyperTextConfig).data(simpleHyperTextData).withResult([]).init();
    LabelStudio.waitForObjectsReady();
    Labels.select("region");
    RichText.selectText("test");
    RichText.hasRegionWithText("test");
    LabelStudio.serialize().then((results) => {
      const resultValue = results[0].value;
      expect(resultValue.start).to.eq(refHyperTextResultValue.start);
      expect(resultValue.end).to.eq(refHyperTextResultValue.end);
      expect(resultValue.globalOffsets.start).to.eq(refHyperTextResultValue.globalOffsets.start);
      expect(resultValue.globalOffsets.end).to.eq(refHyperTextResultValue.globalOffsets.end);
      expect(resultValue.startOffset).to.eq(refHyperTextResultValue.startOffset);
      expect(resultValue.endOffset).to.eq(refHyperTextResultValue.endOffset);
      expect(resultValue.text).to.eq(refHyperTextResultValue.text);

      // This functionality is broken but it also is considered as outdated
      // LabelStudio.params().config(simpleHyperTextConfig).data(simpleHyperTextData).withResult(results).init();
      // LabelStudio.waitForObjectsReady();
      // RichText.hasRegionWithText("test");
      //
      // LabelStudio.serialize().then((results) => {
      //   const resultValue = results[0].value;
      //   expect(resultValue.start).to.eq(refHyperTextResultValue.start);
      //   expect(resultValue.end).to.eq(refHyperTextResultValue.end);
      //   expect(resultValue.globalOffsets.start).to.eq(refHyperTextResultValue.globalOffsets.start);
      //   expect(resultValue.globalOffsets.end).to.eq(refHyperTextResultValue.globalOffsets.end);
      //   expect(resultValue.startOffset).to.eq(refHyperTextResultValue.startOffset);
      //   expect(resultValue.endOffset).to.eq(refHyperTextResultValue.endOffset);
      //   expect(resultValue.text).to.eq(refHyperTextResultValue.text);
      // });
    });
  });

  it("Should calculate global offsets by code points and relative offsets by string length in hypertext", () => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      [FF_LSDV_4620_3]: true,
    });
    LabelStudio.params().config(simpleHyperTextConfig).data(simpleHyperTextData).withResult([]).init();
    LabelStudio.waitForObjectsReady();
    Labels.select("region");
    RichText.selectText("test");
    RichText.hasRegionWithText("test");
    LabelStudio.serialize().then((results) => {
      const resultValue = results[0].value;
      expect(resultValue.start).to.eq(refHyperTextResultValue.start);
      expect(resultValue.end).to.eq(refHyperTextResultValue.end);
      expect(resultValue.globalOffsets.start).to.eq(refHyperTextResultValue.globalOffsets.start);
      expect(resultValue.globalOffsets.end).to.eq(refHyperTextResultValue.globalOffsets.end);
      expect(resultValue.startOffset).to.eq(refHyperTextResultValue.startOffset);
      expect(resultValue.endOffset).to.eq(refHyperTextResultValue.endOffset);
      expect(resultValue.text).to.eq(refHyperTextResultValue.text);

      LabelStudio.params().config(simpleHyperTextConfig).data(simpleHyperTextData).withResult(results).init();
      LabelStudio.waitForObjectsReady();
      RichText.hasRegionWithText("test");

      LabelStudio.serialize().then((results) => {
        const resultValue = results[0].value;
        expect(resultValue.start).to.eq(refHyperTextResultValue.start);
        expect(resultValue.end).to.eq(refHyperTextResultValue.end);
        expect(resultValue.globalOffsets.start).to.eq(refHyperTextResultValue.globalOffsets.start);
        expect(resultValue.globalOffsets.end).to.eq(refHyperTextResultValue.globalOffsets.end);
        expect(resultValue.startOffset).to.eq(refHyperTextResultValue.startOffset);
        expect(resultValue.endOffset).to.eq(refHyperTextResultValue.endOffset);
        expect(resultValue.text).to.eq(refHyperTextResultValue.text);
      });
    });
  });

  const refHyperTextMultilineResultValue = {
    start: "/article[1]/h2[1]/text()[1]",
    end: "/article[1]/p[1]/text()[1]",
    text: "Warning:\\n🐱 This is a test",
    globalOffsets: {
      // this is offset in codepoints ("🐱" + " " = 2 codepoints)
      start: 2,
      end: 27,
    },
    // this is offset in in-browser characters ("🐱" is 2 characters + " " = 3)
    startOffset: 3,
    endOffset: 17,
  };

  it("Should calculate global offsets by code points and relative offsets by string length in multiline hypertext (previous version)", () => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      [FF_LSDV_4620_3]: false,
    });
    LabelStudio.params().config(simpleHyperTextConfig).data(simpleHyperTextData).withResult([]).init();
    LabelStudio.waitForObjectsReady();
    Labels.select("region");
    RichText.selectBetweenTexts("Warning", "test");
    RichText.hasRegionWithText("Warning:");
    RichText.hasRegionWithText("🐱 This is a test");
    LabelStudio.serialize().then((results) => {
      const resultValue = results[0].value;
      expect(resultValue.start).to.eq(refHyperTextMultilineResultValue.start);
      expect(resultValue.end).to.eq(refHyperTextMultilineResultValue.end);
      expect(resultValue.globalOffsets.start).to.eq(refHyperTextMultilineResultValue.globalOffsets.start);
      expect(resultValue.globalOffsets.end).to.eq(refHyperTextMultilineResultValue.globalOffsets.end);
      expect(resultValue.startOffset).to.eq(refHyperTextMultilineResultValue.startOffset);
      expect(resultValue.endOffset).to.eq(refHyperTextMultilineResultValue.endOffset);
      expect(resultValue.text).to.eq(refHyperTextMultilineResultValue.text);

      // This functionality is broken but it also is considered as outdated
      // LabelStudio.params().config(simpleHyperTextConfig).data(simpleHyperTextData).withResult(results).init();
      // LabelStudio.waitForObjectsReady();
      // RichText.hasRegionWithText("Warning:");
      // RichText.hasRegionWithText("🐱 This is a test");
      //
      // LabelStudio.serialize().then((results) => {
      //   const resultValue = results[0].value;
      //   expect(resultValue.start).to.eq(refHyperTextMultilineResultValue.start);
      //   expect(resultValue.end).to.eq(refHyperTextMultilineResultValue.end);
      //   expect(resultValue.globalOffsets.start).to.eq(refHyperTextMultilineResultValue.globalOffsets.start);
      //   expect(resultValue.globalOffsets.end).to.eq(refHyperTextMultilineResultValue.globalOffsets.end);
      //   expect(resultValue.startOffset).to.eq(refHyperTextMultilineResultValue.startOffset);
      //   expect(resultValue.endOffset).to.eq(refHyperTextMultilineResultValue.endOffset);
      //   expect(resultValue.text).to.eq(refHyperTextMultilineResultValue.text);
      // });
    });
  });

  it("Should calculate global offsets by code points and relative offsets by string length in multiline hypertext", () => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      [FF_LSDV_4620_3]: true,
    });
    LabelStudio.params().config(simpleHyperTextConfig).data(simpleHyperTextData).withResult([]).init();
    LabelStudio.waitForObjectsReady();
    Labels.select("region");
    RichText.selectBetweenTexts("Warning", "test");
    RichText.hasRegionWithText("Warning:");
    RichText.hasRegionWithText("🐱 This is a test");
    LabelStudio.serialize().then((results) => {
      const resultValue = results[0].value;
      expect(resultValue.start).to.eq(refHyperTextMultilineResultValue.start);
      expect(resultValue.end).to.eq(refHyperTextMultilineResultValue.end);
      expect(resultValue.globalOffsets.start).to.eq(refHyperTextMultilineResultValue.globalOffsets.start);
      expect(resultValue.globalOffsets.end).to.eq(refHyperTextMultilineResultValue.globalOffsets.end);
      expect(resultValue.startOffset).to.eq(refHyperTextMultilineResultValue.startOffset);
      expect(resultValue.endOffset).to.eq(refHyperTextMultilineResultValue.endOffset);
      expect(resultValue.text).to.eq(refHyperTextMultilineResultValue.text);

      LabelStudio.params().config(simpleHyperTextConfig).data(simpleHyperTextData).withResult(results).init();
      LabelStudio.waitForObjectsReady();
      RichText.hasRegionWithText("Warning:");
      RichText.hasRegionWithText("🐱 This is a test");

      LabelStudio.serialize().then((results) => {
        const resultValue = results[0].value;
        expect(resultValue.start).to.eq(refHyperTextMultilineResultValue.start);
        expect(resultValue.end).to.eq(refHyperTextMultilineResultValue.end);
        expect(resultValue.globalOffsets.start).to.eq(refHyperTextMultilineResultValue.globalOffsets.start);
        expect(resultValue.globalOffsets.end).to.eq(refHyperTextMultilineResultValue.globalOffsets.end);
        expect(resultValue.startOffset).to.eq(refHyperTextMultilineResultValue.startOffset);
        expect(resultValue.endOffset).to.eq(refHyperTextMultilineResultValue.endOffset);
        expect(resultValue.text).to.eq(refHyperTextMultilineResultValue.text);
      });
    });
  });

  it("Heuristic edge case", () => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      [FF_LSDV_4620_3]: true,
    });
    LabelStudio.params().config(simpleHyperTextConfig).data({ text: "<p>🐱\nmeans cat</p>" }).withResult([]).init();
    LabelStudio.waitForObjectsReady();
    Labels.select("region");
    RichText.selectText("means");
    RichText.hasRegionWithText("means");

    LabelStudio.serialize().then((results) => {
      const resultValue = results[0].value;
      expect(resultValue.start).to.eq("/p[1]/text()[1]");
      expect(resultValue.end).to.eq("/p[1]/text()[1]");
      expect(resultValue.globalOffsets.start).to.eq(2);
      expect(resultValue.globalOffsets.end).to.eq(7);
      expect(resultValue.startOffset).to.eq(3);
      expect(resultValue.endOffset).to.eq(8);
      expect(resultValue.text).to.eq("means");
    });
  });
});
