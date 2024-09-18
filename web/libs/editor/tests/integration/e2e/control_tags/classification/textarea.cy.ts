import { LabelStudio, ImageView, Textarea, ToolBar, Modals, Sidebar } from "@humansignal/frontend-test/helpers/LSF";
import {
  simpleImageTextareaConfig,
  simpleImageData,
  perTagTextareaResult,
  perTagMIGTextareaConfig,
  simpleMIGData,
  requiredPerTagMIGTextareaConfig,
  TEXTAREA_REQUIRED_WARNING,
  perRegionMIGTextareaConfig,
  perRegionRegionsResult,
  perRegionTextareaResult,
  requiredPerRegionMIGTextareaConfig,
  perItemMIGTextareaConfig,
  perItemTextareaResult,
  requiredPerItemMIGTextareaConfig,
} from "../../../data/control_tags/per-item";
import { commonBeforeEach } from "./common";

beforeEach(commonBeforeEach);

/* <Textarea /> */
describe("Classification - single image - Textarea", () => {
  it("should create result without item_index", () => {
    LabelStudio.params().config(simpleImageTextareaConfig).data(simpleImageData).withResult([]).init();

    ImageView.waitForImage();

    Textarea.type("Text 1{enter}");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });

  it("should load perTag result correctly", () => {
    LabelStudio.params()
      .config(simpleImageTextareaConfig)
      .data(simpleImageData)
      .withResult(perTagTextareaResult)
      .init();

    ImageView.waitForImage();

    Textarea.hasValue("Text 1");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.deep.include(perTagTextareaResult[0]);
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });
});
describe("Classification - MIG perTag - Textarea", () => {
  it("should not have item_index in result", () => {
    LabelStudio.params().config(perTagMIGTextareaConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Textarea.type("Text 1{enter}");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });

  it("should load perTag result correctly", () => {
    LabelStudio.params().config(perTagMIGTextareaConfig).data(simpleMIGData).withResult(perTagTextareaResult).init();

    ImageView.waitForImage();

    Textarea.hasValue("Text 1");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.deep.include(perTagTextareaResult[0]);
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });

  it("should keep value between items", () => {
    LabelStudio.params().config(perTagMIGTextareaConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Textarea.type("Text 1{enter}");
    Textarea.hasValue("Text 1");

    ImageView.paginationNextBtn.click();

    Textarea.hasValue("Text 1");
  });

  it("should require result", () => {
    LabelStudio.params().config(requiredPerTagMIGTextareaConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(TEXTAREA_REQUIRED_WARNING);
  });

  it("should not require result if there is one", () => {
    LabelStudio.params().config(requiredPerTagMIGTextareaConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Textarea.type("123");

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
describe("Control Tags - MIG perRegion - Textarea", () => {
  it("should create result with item_index", () => {
    LabelStudio.params()
      .config(perRegionMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    Textarea.type("Text 1{enter}");

    LabelStudio.serialize().then((result) => {
      expect(result.length).to.be.eq(3);
      expect(result[1]).to.include({
        type: "textarea",
        item_index: 0,
      });
    });
  });

  it("should load result correctly", () => {
    LabelStudio.params()
      .config(perRegionMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult(perRegionTextareaResult)
      .init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    Textarea.hasValue("Text 1");

    LabelStudio.serialize().then((result) => {
      const { value, ...expectedResult } = perRegionTextareaResult[1];

      expect(result.length).to.be.eq(3);
      expect(result[1]).to.deep.include(expectedResult);
      expect(result[1].value.text).to.be.deep.eq(value.text);
    });
  });

  it("should require result", () => {
    LabelStudio.params()
      .config(requiredPerRegionMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(TEXTAREA_REQUIRED_WARNING);
  });

  it("should require result for other region too", () => {
    LabelStudio.params()
      .config(requiredPerRegionMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    Textarea.type("Text 1{enter}");

    ToolBar.submitBtn.click();
    Modals.hasWarning(TEXTAREA_REQUIRED_WARNING);
  });

  it("should not require result if there are all of them", () => {
    LabelStudio.params()
      .config(requiredPerRegionMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    Textarea.type("Text 1{enter}");
    Sidebar.findRegionByIndex(1).click();
    ImageView.waitForImage();
    Textarea.type("Text 2{enter}");

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
describe("Control Tags - MIG perItem - Textarea", () => {
  it("should create result with item_index", () => {
    LabelStudio.params().config(perItemMIGTextareaConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Textarea.type("Text 1{enter}");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.have.property("item_index", 0);
    });
  });

  it("should load perItem result correctly", () => {
    LabelStudio.params().config(perItemMIGTextareaConfig).data(simpleMIGData).withResult(perItemTextareaResult).init();

    ImageView.waitForImage();

    Textarea.hasValue("Text 1");
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Textarea.hasValue("Text 2");
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Textarea.hasValue("Text 3");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.deep.include(perItemTextareaResult[0]);
      expect(result[1]).to.deep.include(perItemTextareaResult[1]);
      expect(result[2]).to.deep.include(perItemTextareaResult[2]);
    });
  });

  it("should be able to create result for second item", () => {
    LabelStudio.params().config(perItemMIGTextareaConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Textarea.type("Text 1{enter}");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.have.property("item_index", 1);
    });
  });

  it("should be able to create more that one result", () => {
    LabelStudio.params().config(perItemMIGTextareaConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Textarea.type("Text 1{enter}");

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Textarea.type("Text 2{enter}");

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Textarea.type("Text 3{enter}");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.include({ item_index: 0 });
      expect(result[0].value.text).to.be.deep.eq(["Text 1"]);

      expect(result[1]).to.include({ item_index: 1 });
      expect(result[1].value.text).to.be.deep.eq(["Text 2"]);

      expect(result[2]).to.include({ item_index: 2 });
      expect(result[2].value.text).to.be.deep.eq(["Text 3"]);
    });
  });

  it("should require result", () => {
    LabelStudio.params()
      .config(requiredPerItemMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(TEXTAREA_REQUIRED_WARNING);
  });

  it("should require result for other region too", () => {
    LabelStudio.params()
      .config(requiredPerItemMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Textarea.type("Text 1{enter}");

    ToolBar.submitBtn.click();
    Modals.hasWarning(TEXTAREA_REQUIRED_WARNING);
  });

  it("should not require result if there are all of them", () => {
    LabelStudio.params()
      .config(requiredPerItemMIGTextareaConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Textarea.type("Text 1{enter}");
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Textarea.type("Text 2{enter}");
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Textarea.type("Text 3{enter}");
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Textarea.type("Text 4{enter}");

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
