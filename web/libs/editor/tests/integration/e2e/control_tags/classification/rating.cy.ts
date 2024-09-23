import { LabelStudio, ImageView, Rating, ToolBar, Modals, Sidebar } from "@humansignal/frontend-test/helpers/LSF";
import {
  simpleImageRatingConfig,
  simpleImageData,
  perTagRatingResult,
  perTagMIGRatingConfig,
  simpleMIGData,
  requiredPerTagMIGRatingConfig,
  RATING_REQUIRED_WARNING,
  perRegionMIGRatingConfig,
  perRegionRegionsResult,
  perRegionRatingResult,
  requiredPerRegionMIGRatingConfig,
  perItemMIGRatingConfig,
  perItemRatingResult,
  requiredPerItemMIGRatingConfig,
} from "../../../data/control_tags/per-item";
import { commonBeforeEach } from "./common";

beforeEach(commonBeforeEach);

/* <Rating /> */
describe("Classification - single image - Rating", () => {
  it("should create result without item_index", () => {
    LabelStudio.params().config(simpleImageRatingConfig).data(simpleImageData).withResult([]).init();

    ImageView.waitForImage();

    Rating.setValue(4);

    LabelStudio.serialize().then((result) => {
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });

  it("should load perTag result correctly", () => {
    LabelStudio.params().config(simpleImageRatingConfig).data(simpleImageData).withResult(perTagRatingResult).init();

    ImageView.waitForImage();

    Rating.hasValue(4);

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.deep.include(perTagRatingResult[0]);
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });
});
describe("Classification - MIG perTag - Rating", () => {
  it("should not have item_index in result", () => {
    LabelStudio.params().config(perTagMIGRatingConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Rating.setValue(4);

    LabelStudio.serialize().then((result) => {
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });

  it("should load perTag result correctly", () => {
    LabelStudio.params().config(perTagMIGRatingConfig).data(simpleMIGData).withResult(perTagRatingResult).init();

    ImageView.waitForImage();

    Rating.hasValue(4);

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.deep.include(perTagRatingResult[0]);
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });

  it("should keep value between items", () => {
    LabelStudio.params().config(perTagMIGRatingConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Rating.setValue(4);
    Rating.hasValue(4);

    ImageView.paginationNextBtn.click();

    Rating.hasValue(4);
  });

  it("should require result", () => {
    LabelStudio.params().config(requiredPerTagMIGRatingConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(RATING_REQUIRED_WARNING);
  });

  it("should not require result if there is one", () => {
    LabelStudio.params().config(requiredPerTagMIGRatingConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Rating.setValue(4);

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
describe("Control Tags - MIG perRegion - Rating", () => {
  it("should create result with item_index", () => {
    LabelStudio.params().config(perRegionMIGRatingConfig).data(simpleMIGData).withResult(perRegionRegionsResult).init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    Rating.setValue(4);

    LabelStudio.serialize().then((result) => {
      expect(result.length).to.be.eq(3);
      expect(result[1]).to.include({
        type: "rating",
        item_index: 0,
      });
    });
  });

  it("should load result correctly", () => {
    LabelStudio.params().config(perRegionMIGRatingConfig).data(simpleMIGData).withResult(perRegionRatingResult).init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    Rating.hasValue(4);

    LabelStudio.serialize().then((result) => {
      const { value, ...expectedResult } = perRegionRatingResult[1];

      expect(result.length).to.be.eq(3);
      expect(result[1]).to.deep.include(expectedResult);
      expect(result[1].value.rating).to.be.deep.eq(value.rating);
    });
  });

  it("should require result", () => {
    LabelStudio.params()
      .config(requiredPerRegionMIGRatingConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(RATING_REQUIRED_WARNING);
  });

  it("should require result for other region too", () => {
    LabelStudio.params()
      .config(requiredPerRegionMIGRatingConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    Rating.setValue(4);

    ToolBar.submitBtn.click();
    Modals.hasWarning(RATING_REQUIRED_WARNING);
  });

  it("should not require result if there are all of them", () => {
    LabelStudio.params()
      .config(requiredPerRegionMIGRatingConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    Rating.setValue(3);

    Sidebar.findRegionByIndex(1).click();
    ImageView.waitForImage();
    Rating.setValue(4);

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
describe("Control Tags - MIG perItem - Rating", () => {
  it("should create result with item_index", () => {
    LabelStudio.params().config(perItemMIGRatingConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Rating.setValue(4);

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.have.property("item_index", 0);
    });
  });

  it("should load perItem result correctly", () => {
    LabelStudio.params().config(perItemMIGRatingConfig).data(simpleMIGData).withResult(perItemRatingResult).init();

    ImageView.waitForImage();

    Rating.hasValue(3);
    ImageView.paginationNextBtn.click();
    Rating.hasValue(4);
    ImageView.paginationNextBtn.click();
    Rating.hasValue(5);

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.deep.include(perItemRatingResult[0]);
      expect(result[1]).to.deep.include(perItemRatingResult[1]);
      expect(result[2]).to.deep.include(perItemRatingResult[2]);
    });
  });

  it("should be able to create result for second item", () => {
    LabelStudio.params().config(perItemMIGRatingConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Rating.setValue(4);

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.have.property("item_index", 1);
    });
  });

  it("should be able to create more that one result", () => {
    LabelStudio.params().config(perItemMIGRatingConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Rating.setValue(3);

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Rating.setValue(4);

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Rating.setValue(5);

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.include({ item_index: 0 });
      expect(result[0]).to.nested.include({ "value.rating": 3 });

      expect(result[1]).to.include({ item_index: 1 });
      expect(result[1]).to.nested.include({ "value.rating": 4 });

      expect(result[2]).to.include({ item_index: 2 });
      expect(result[2]).to.nested.include({ "value.rating": 5 });
    });
  });

  it("should require result", () => {
    LabelStudio.params()
      .config(requiredPerItemMIGRatingConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(RATING_REQUIRED_WARNING);
  });

  it("should require result for other region too", () => {
    LabelStudio.params()
      .config(requiredPerItemMIGRatingConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Rating.setValue(4);

    ToolBar.submitBtn.click();
    Modals.hasWarning(RATING_REQUIRED_WARNING);
  });

  it("should not require result if there are all of them", () => {
    LabelStudio.params()
      .config(requiredPerItemMIGRatingConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Rating.setValue(3);
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Rating.setValue(4);
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Rating.setValue(5);
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Rating.setValue(1);

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
