import { LabelStudio, ImageView, ToolBar, Number, useNumber, Modals, Sidebar } from "@humansignal/frontend-test/helpers/LSF";
import {
  simpleImageNumberConfig,
  simpleImageData,
  perTagNumberResult,
  perTagMIGNumberConfig,
  simpleMIGData,
  requiredPerTagMIGNumberConfig,
  NUMBER_REQUIRED_WARNING,
  perRegionMIGNumberConfig,
  perRegionRegionsResult,
  perRegionNumberResult,
  requiredPerRegionMIGNumberConfig,
  perItemMIGNumberConfig,
  perItemNumberResult,
  requiredPerItemMIGNumberConfig,
} from "../../../data/control_tags/per-item";

/* <Number /> */
describe("Classification - single image - Number", () => {
  it("should keep missing values blank and serialize an explicit zero", () => {
    LabelStudio.params().config(simpleImageNumberConfig).data(simpleImageData).withResult([]).init();

    ImageView.waitForImage();
    Number.hasValue("");
    LabelStudio.serialize().should("deep.equal", []);

    Number.type("123");
    Number.input.clear();
    Number.hasValue("");
    LabelStudio.serialize().should("deep.equal", []);

    Number.type("0");
    Number.hasValue("0");
    LabelStudio.serialize().then((result) => {
      expect(result).to.have.length(1);
      expect(result[0]).to.nested.include({ "value.number": 0 });
    });
  });

  it("should create result without item_index", () => {
    LabelStudio.params().config(simpleImageNumberConfig).data(simpleImageData).withResult([]).init();

    ImageView.waitForImage();

    Number.type("123");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });

  it("should load perTag result correctly", () => {
    LabelStudio.params().config(simpleImageNumberConfig).data(simpleImageData).withResult(perTagNumberResult).init();

    ImageView.waitForImage();

    Number.hasValue("123");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.deep.include(perTagNumberResult[0]);
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });
});
describe("Classification - MIG perTag - Number", () => {
  it("should not have item_index in result", () => {
    LabelStudio.params().config(perTagMIGNumberConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Number.type("123");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });

  it("should load perTag result correctly", () => {
    LabelStudio.params().config(perTagMIGNumberConfig).data(simpleMIGData).withResult(perTagNumberResult).init();

    ImageView.waitForImage();

    Number.hasValue("123");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.deep.include(perTagNumberResult[0]);
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });

  it("should keep value between items", () => {
    LabelStudio.params().config(perTagMIGNumberConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Number.type("123");
    Number.hasValue("123");

    ImageView.paginationNextBtn.click();

    Number.hasValue("123");
  });

  it("should require result", () => {
    LabelStudio.params().config(requiredPerTagMIGNumberConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    ToolBar.updateBtn.click();
    Modals.hasWarning(NUMBER_REQUIRED_WARNING);
  });

  it("should require a result after clearing", () => {
    LabelStudio.params().config(requiredPerTagMIGNumberConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();
    Number.type("123");
    Number.input.clear();
    Number.hasValue("");

    ToolBar.updateBtn.click();
    Modals.hasWarning(NUMBER_REQUIRED_WARNING);
  });

  it("should not require result if there is one", () => {
    LabelStudio.params().config(requiredPerTagMIGNumberConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Number.type("123");

    ToolBar.updateBtn.click();
    Modals.hasNoWarnings();
  });
});
describe("Control Tags - MIG perRegion - Number", () => {
  it("should preserve regions and other values when clearing and reloading", () => {
    const config = `<View>
      <Image name="image" valueList="$images"/>
      <Rectangle name="rect" toName="image" />
      <Number name="number" toName="image" perRegion="true" />
      <Number name="other" toName="image" perRegion="true" />
    </View>`;
    const otherNumber = useNumber("&:eq(1)");
    LabelStudio.params().config(config).data(simpleMIGData).withResult(perRegionNumberResult).init();

    ImageView.waitForImage();
    Sidebar.findRegionByIndex(0).click();
    Number.hasValue("123");
    otherNumber.type("42");
    Sidebar.findRegionByIndex(1).click();
    Number.type("456");

    LabelStudio.serialize().then((before) => {
      const expected = before.filter((result) => !(result.from_name === "number" && result.id === "rect_1"));

      Sidebar.findRegionByIndex(0).click();
      Number.input.clear();
      Number.hasValue("");
      otherNumber.hasValue("42");
      Sidebar.hasRegions(2);

      Sidebar.findRegionByIndex(1).click();
      Number.hasValue("456");
      Sidebar.findRegionByIndex(0).click();
      Number.hasValue("");
      otherNumber.hasValue("42");

      LabelStudio.serialize().then((result) => {
        expect(result).to.deep.equal(expected);
        LabelStudio.params().config(config).data(simpleMIGData).withResult(result).init();

        ImageView.waitForImage();
        Sidebar.hasRegions(2);
        Sidebar.findRegionByIndex(0).click();
        Number.hasValue("");
        otherNumber.hasValue("42");
        Sidebar.findRegionByIndex(1).click();
        Number.hasValue("456");
        LabelStudio.serialize().should("deep.equal", expected);
      });
    });
  });

  it("should create result with item_index", () => {
    LabelStudio.params().config(perRegionMIGNumberConfig).data(simpleMIGData).withResult(perRegionRegionsResult).init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    Number.type("123");

    LabelStudio.serialize().then((result) => {
      expect(result.length).to.be.eq(3);
      expect(result[1]).to.include({
        type: "number",
        item_index: 0,
      });
    });
  });

  it("should load result correctly", () => {
    LabelStudio.params().config(perRegionMIGNumberConfig).data(simpleMIGData).withResult(perRegionNumberResult).init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    Number.hasValue("123");

    LabelStudio.serialize().then((result) => {
      const { value, ...expectedResult } = perRegionNumberResult[1];

      expect(result.length).to.be.eq(3);
      expect(result[1]).to.deep.include(expectedResult);
      expect(result[1].value.number).to.be.deep.eq(value.number);
    });
  });

  it("should require result", () => {
    LabelStudio.params()
      .config(requiredPerRegionMIGNumberConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.updateBtn.click();
    Modals.hasWarning(NUMBER_REQUIRED_WARNING);
  });

  it("should require result for other region too", () => {
    LabelStudio.params()
      .config(requiredPerRegionMIGNumberConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    Number.type("123");

    ToolBar.updateBtn.click();
    Modals.hasWarning(NUMBER_REQUIRED_WARNING);
  });

  it("should not require result if there are all of them", () => {
    LabelStudio.params()
      .config(requiredPerRegionMIGNumberConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    Number.type("123");

    Sidebar.findRegionByIndex(1).click();
    ImageView.waitForImage();
    Number.type("456");

    ToolBar.updateBtn.click();
    Modals.hasNoWarnings();
  });
});
describe("Control Tags - MIG perItem - Number", () => {
  it("should clear one item without erasing other items", () => {
    LabelStudio.params().config(perItemMIGNumberConfig).data(simpleMIGData).withResult(perItemNumberResult).init();

    ImageView.waitForImage();
    Number.hasValue("123");
    Number.input.clear();
    Number.hasValue("");
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Number.hasValue("456");
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Number.hasValue("789");
    ImageView.paginationPrevBtn.click();
    ImageView.paginationPrevBtn.click();
    ImageView.waitForImage();
    Number.hasValue("");

    LabelStudio.serialize().then((result) => {
      expect(result).to.have.length(2);
      expect(result[0]).to.deep.include(perItemNumberResult[1]);
      expect(result[1]).to.deep.include(perItemNumberResult[2]);
    });
  });

  it("should create result with item_index", () => {
    LabelStudio.params().config(perItemMIGNumberConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Number.type("123");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.have.property("item_index", 0);
    });
  });

  it("should load perItem result correctly", () => {
    LabelStudio.params().config(perItemMIGNumberConfig).data(simpleMIGData).withResult(perItemNumberResult).init();

    ImageView.waitForImage();

    Number.hasValue("123");
    ImageView.paginationNextBtn.click();
    Number.hasValue("456");
    ImageView.paginationNextBtn.click();
    Number.hasValue("789");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.deep.include(perItemNumberResult[0]);
      expect(result[1]).to.deep.include(perItemNumberResult[1]);
      expect(result[2]).to.deep.include(perItemNumberResult[2]);
    });
  });

  it("should be able to create result for second item", () => {
    LabelStudio.params().config(perItemMIGNumberConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Number.type("456");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.have.property("item_index", 1);
    });
  });

  it("should be able to create more that one result", () => {
    LabelStudio.params().config(perItemMIGNumberConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Number.type("123");

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Number.type("456");

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Number.type("789");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.include({ item_index: 0 });
      expect(result[0]).to.nested.include({ "value.number": 123 });

      expect(result[1]).to.include({ item_index: 1 });
      expect(result[1]).to.nested.include({ "value.number": 456 });

      expect(result[2]).to.include({ item_index: 2 });
      expect(result[2]).to.nested.include({ "value.number": 789 });
    });
  });

  it("should require result", () => {
    LabelStudio.params()
      .config(requiredPerItemMIGNumberConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.updateBtn.click();
    Modals.hasWarning(NUMBER_REQUIRED_WARNING);
  });

  it("should require result for other region too", () => {
    LabelStudio.params()
      .config(requiredPerItemMIGNumberConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Number.type("123");

    ToolBar.updateBtn.click();
    Modals.hasWarning(NUMBER_REQUIRED_WARNING);
  });

  it("should not require result if there are all of them", () => {
    LabelStudio.params()
      .config(requiredPerItemMIGNumberConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Number.type("123");
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Number.type("456");
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Number.type("789");
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Number.type("0");

    ToolBar.updateBtn.click();
    Modals.hasNoWarnings();
  });
});
