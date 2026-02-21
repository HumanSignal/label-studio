import { Choices, LabelStudio, Tooltip } from "@humansignal/frontend-test/helpers/LSF";
import {
  choicesConfig,
  choicesMultipleSelectionConfig,
  choicesSelectLayoutConfig,
  simpleData,
} from "../../data/control_tags/choice";
import { FF_DEV_2007 } from "@humansignal/frontend-test/feature-flags";

describe("Control Tags - Choice", () => {
  describe("Old version", () => {
    beforeEach(() => {
      LabelStudio.addFeatureFlagsOnPageLoad({
        [FF_DEV_2007]: false,
      });
    });

    it('should show hint for <Choice /> when choice="single"', () => {
      LabelStudio.params().config(choicesConfig).data(simpleData).withResult([]).init();

      Choices.findChoice("Choice 2").trigger("mouseover");
      Tooltip.hasText("A hint for Choice 2");
    });
    it('should show hint for <Choice /> when choice="multiple"', () => {
      LabelStudio.params().config(choicesMultipleSelectionConfig).data(simpleData).withResult([]).init();

      Choices.findChoice("Choice 2").trigger("mouseover");
      Tooltip.hasText("A hint for Choice 2");
    });
    it('should show hint for <Choice /> when layout="select"', () => {
      LabelStudio.params().config(choicesSelectLayoutConfig).data(simpleData).withResult([]).init();

      Choices.toggleSelect();
      Choices.findOption("Choice 2").trigger("mouseover", { force: true });
      Tooltip.hasText("A hint for Choice 2");
    });

    it("select layout: select option and serialize", () => {
      LabelStudio.params().config(choicesSelectLayoutConfig).data(simpleData).withResult([]).init();

      Choices.toggleSelect();
      Choices.findOption("Choice 2").click();
      Choices.toggleSelect();
      LabelStudio.serialize().then((result) => {
        expect(result).to.have.lengthOf(1);
        expect(result[0].value.choices).to.include("Choice 2");
      });
    });
  });

  describe("New version", () => {
    beforeEach(() => {
      LabelStudio.addFeatureFlagsOnPageLoad({
        [FF_DEV_2007]: true,
      });
    });

    it("should show hint for <Choise />", () => {
      LabelStudio.params().config(choicesConfig).data(simpleData).withResult([]).init();

      Choices.findChoice("Choice 2").trigger("mouseover");
      Tooltip.hasText("A hint for Choice 2");
    });

    it("should show hint for <Choise />", () => {
      LabelStudio.params().config(choicesMultipleSelectionConfig).data(simpleData).withResult([]).init();

      Choices.findChoice("Choice 2").trigger("mouseover");
      Tooltip.hasText("A hint for Choice 2");
    });
  });
});
