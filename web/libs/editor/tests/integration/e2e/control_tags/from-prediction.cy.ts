import {
  Choices,
  DateTime,
  LabelStudio,
  Number,
  Rating,
  Textarea,
  ToolBar,
  useTextarea,
} from "@humansignal/frontend-test/helpers/LSF";
import { Hotkeys } from "@humansignal/frontend-test/helpers/LSF/Hotkeys";
import { allClassificationsConfig, prediction, textData } from "../../data/control_tags/from-prediction";

describe("Classification from prediction", () => {
  it('by default should have origin "prediction"', () => {
    LabelStudio.params().config(allClassificationsConfig).data(textData).withPrediction(prediction).init();
    LabelStudio.waitForObjectsReady();
    LabelStudio.serialize().then((results) => {
      for (const result of results) {
        expect(result.origin).to.equal("prediction");
      }
    });
  });

  it('should have origin "prediction-changed" after changing prediction', () => {
    const SecondTextarea = useTextarea("&:eq(1)");
    LabelStudio.params().config(allClassificationsConfig).data(textData).withPrediction(prediction).init();
    LabelStudio.waitForObjectsReady();
    ToolBar.clickCopyAnnotationBtn();
    LabelStudio.waitForObjectsReady();
    Choices.findChoice("Choice 2").click();
    DateTime.type("1999-11-11T11:11:11.111Z");
    Number.type("123");
    Rating.setValue(2);
    Textarea.type("Some other text{Enter}");
    SecondTextarea.clickRowEdit(1);
    SecondTextarea.rowInput(1).dblclick();
    SecondTextarea.rowType(1, " longer at the end{Enter}");
    LabelStudio.serialize().then((results) => {
      for (const result of results) {
        expect(result.origin).to.equal(
          "prediction-changed",
          `Prediction origin was not updated for "${result.from_name}"`,
        );
      }
    });
  });

  it("should work correctly with undo", () => {
    const SecondTextarea = useTextarea("&:eq(1)");
    LabelStudio.params().config(allClassificationsConfig).data(textData).withPrediction(prediction).init();
    LabelStudio.waitForObjectsReady();
    ToolBar.clickCopyAnnotationBtn();
    LabelStudio.waitForObjectsReady();
    Choices.findChoice("Choice 2").click();
    DateTime.type("1999-11-11T11:11:11.111Z");
    Number.type("1");
    Rating.setValue(2);
    Textarea.type("Some other text{Enter}");
    SecondTextarea.clickRowEdit(1);
    SecondTextarea.rowInput(1).dblclick();
    SecondTextarea.rowType(1, " longer at the end{Enter}");
    for (let i = 0; i < 6; i++) {
      Hotkeys.undo();
    }
    LabelStudio.serialize().then((results) => {
      for (const result of results) {
        expect(result.origin).to.equal("prediction");
      }
    });
  });
});
