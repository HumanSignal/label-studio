import { LabelStudio, ImageView, DateTime, Modals, Sidebar, ToolBar } from "@humansignal/frontend-test/helpers/LSF";
import {
  DATETIME_REQUIRED_WARNING,
  perItemDateTimeResult,
  perItemMIGDateTimeConfig,
  perRegionDateTimeResult,
  perRegionMIGDateTimeConfig,
  perRegionRegionsResult,
  perTagDateTimeResult,
  perTagMIGDateTimeConfig,
  requiredPerItemMIGDateTimeConfig,
  requiredPerRegionMIGDateTimeConfig,
  requiredPerTagMIGDateTimeConfig,
  simpleImageData,
  simpleImageDateTimeConfig,
  simpleMIGData,
} from "../../../data/control_tags/per-item";
import { commonBeforeEach } from "./common";

beforeEach(commonBeforeEach);

/* <DateTime /> */
describe("Classification - single image - DateTime", () => {
  it("should create result without item_index", () => {
    LabelStudio.params().config(simpleImageDateTimeConfig).data(simpleImageData).withResult([]).init();

    ImageView.waitForImage();

    DateTime.type("2000-01-01T01:01");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });

  it("should load perTag result correctly", () => {
    LabelStudio.params()
      .config(simpleImageDateTimeConfig)
      .data(simpleImageData)
      .withResult(perTagDateTimeResult)
      .init();

    ImageView.waitForImage();

    DateTime.hasValue("2000-01-01T01:01");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.deep.include(perTagDateTimeResult[0]);
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });
});
describe("Classification - MIG perTag - DateTime", () => {
  it("should not have item_index in result", () => {
    LabelStudio.params().config(perTagMIGDateTimeConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    DateTime.type("2000-01-01T01:01");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });

  it("should load perTag result correctly", () => {
    LabelStudio.params().config(perTagMIGDateTimeConfig).data(simpleMIGData).withResult(perTagDateTimeResult).init();

    ImageView.waitForImage();

    DateTime.hasValue("2000-01-01T01:01");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.deep.include(perTagDateTimeResult[0]);
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });

  it("should keep value between items", () => {
    LabelStudio.params().config(perTagMIGDateTimeConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    DateTime.type("2000-01-01T01:01");
    DateTime.hasValue("2000-01-01T01:01");

    ImageView.paginationNextBtn.click();

    DateTime.hasValue("2000-01-01T01:01");
  });

  it("should require result", () => {
    LabelStudio.params().config(requiredPerTagMIGDateTimeConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(DATETIME_REQUIRED_WARNING);
  });

  it("should not require result if there is one", () => {
    LabelStudio.params().config(requiredPerTagMIGDateTimeConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    DateTime.type("2000-01-01T01:01");

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
describe("Control Tags - MIG perRegion - DateTime", () => {
  it("should create result with item_index", () => {
    LabelStudio.params()
      .config(perRegionMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    DateTime.type("2000-01-01T01:01");

    LabelStudio.serialize().then((result) => {
      expect(result.length).to.be.eq(3);
      expect(result[1]).to.include({
        type: "datetime",
        item_index: 0,
      });
    });
  });

  it("should load result correctly", () => {
    LabelStudio.params()
      .config(perRegionMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult(perRegionDateTimeResult)
      .init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    DateTime.hasValue("2000-01-01T01:01");

    LabelStudio.serialize().then((result) => {
      const { value, ...expectedResult } = perRegionDateTimeResult[1];

      expect(result.length).to.be.eq(3);
      expect(result[1]).to.deep.include(expectedResult);
      expect(result[1].value.datetime).to.be.deep.eq(value.datetime);
    });
  });

  it("should require result", () => {
    LabelStudio.params()
      .config(requiredPerRegionMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(DATETIME_REQUIRED_WARNING);
  });

  it("should require result for other region too", () => {
    LabelStudio.params()
      .config(requiredPerRegionMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    DateTime.type("2000-01-01T01:01");

    ToolBar.submitBtn.click();
    Modals.hasWarning(DATETIME_REQUIRED_WARNING);
  });

  it("should not require result if there are all of them", () => {
    LabelStudio.params()
      .config(requiredPerRegionMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    DateTime.type("2000-01-01T01:01");

    Sidebar.findRegionByIndex(1).click();
    ImageView.waitForImage();
    DateTime.type("2000-02-02T02:02");

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
describe("Control Tags - MIG perItem - DateTime", () => {
  it("should create result with item_index", () => {
    LabelStudio.params().config(perItemMIGDateTimeConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    DateTime.type("2000-01-01T01:01");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.have.property("item_index", 0);
    });
  });

  it("should load perItem result correctly", () => {
    LabelStudio.params().config(perItemMIGDateTimeConfig).data(simpleMIGData).withResult(perItemDateTimeResult).init();

    ImageView.waitForImage();

    DateTime.hasValue("2000-01-01T01:01");
    ImageView.paginationNextBtn.click();
    DateTime.hasValue("2000-02-02T02:02");
    ImageView.paginationNextBtn.click();
    DateTime.hasValue("2000-03-03T03:03");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.deep.include(perItemDateTimeResult[0]);
      expect(result[1]).to.deep.include(perItemDateTimeResult[1]);
      expect(result[2]).to.deep.include(perItemDateTimeResult[2]);
    });
  });

  it("should be able to create result for second item", () => {
    LabelStudio.params().config(perItemMIGDateTimeConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    DateTime.type("2000-01-01T01:01");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.have.property("item_index", 1);
    });
  });

  it("should be able to create more that one result", () => {
    LabelStudio.params().config(perItemMIGDateTimeConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    DateTime.type("2000-01-01T01:01");

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    DateTime.type("2000-02-02T02:02");

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    DateTime.type("2000-03-03T03:03");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.include({ item_index: 0 });
      expect(result[0]).to.nested.include({ "value.datetime": "2000-01-01T01:01" });

      expect(result[1]).to.include({ item_index: 1 });
      expect(result[1]).to.nested.include({ "value.datetime": "2000-02-02T02:02" });

      expect(result[2]).to.include({ item_index: 2 });
      expect(result[2]).to.nested.include({ "value.datetime": "2000-03-03T03:03" });
    });
  });

  it("should require result", () => {
    LabelStudio.params()
      .config(requiredPerItemMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.submitBtn.click();
    Modals.hasWarning(DATETIME_REQUIRED_WARNING);
  });

  it("should require result for other region too", () => {
    LabelStudio.params()
      .config(requiredPerItemMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    DateTime.type("2000-01-01T01:01");

    ToolBar.submitBtn.click();
    Modals.hasWarning(DATETIME_REQUIRED_WARNING);
  });

  it("should not require result if there are all of them", () => {
    LabelStudio.params()
      .config(requiredPerItemMIGDateTimeConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    DateTime.type("2000-01-01T01:01");
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    DateTime.type("2000-02-02T02:02");
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    DateTime.type("2000-03-03T03:03");
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    DateTime.type("2000-04-04T04:04");

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();
  });
});
