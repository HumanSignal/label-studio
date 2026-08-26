import { LabelStudio, ImageView, Choices, ToolBar, Modals, Sidebar } from "@humansignal/frontend-test/helpers/LSF";
import {
  simpleImageChoicesConfig,
  simpleImageData,
  perTagChoicesResult,
  perTagMIGChoicesConfig,
  simpleMIGData,
  requiredPerTagMIGChoicesConfig,
  CHOICES_REQUIRED_WARNING,
  perRegionMIGChoicesConfig,
  perRegionRegionsResult,
  perRegionChoicesResult,
  requiredPerRegionMIGChoicesConfig,
  perItemMIGChoicesConfig,
  perItemChoicesResult,
  requiredPerItemMIGChoicesConfig,
} from "../../../data/control_tags/per-item";
import { commonBeforeEach } from "./common";

beforeEach(commonBeforeEach);

/* <Choices /> */
describe("Classification - single image - Choices", () => {
  it("should create result without item_index", () => {
    LabelStudio.params().config(simpleImageChoicesConfig).data(simpleImageData).withResult([]).init();

    ImageView.waitForImage();

    Choices.findChoice("Choice 2").click();

    LabelStudio.serialize().then((result) => {
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });

  it("should load perTag result correctly", () => {
    LabelStudio.params().config(simpleImageChoicesConfig).data(simpleImageData).withResult(perTagChoicesResult).init();

    ImageView.waitForImage();

    Choices.hasCheckedChoice("Choice 1");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.deep.include(perTagChoicesResult[0]);
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });
});
describe("Classification - MIG perTag - Choices", () => {
  it("should not have item_index in result", () => {
    LabelStudio.params().config(perTagMIGChoicesConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Choices.findChoice("Choice 2").click();

    LabelStudio.serialize().then((result) => {
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });

  it("should load perTag result correctly", () => {
    LabelStudio.params().config(perTagMIGChoicesConfig).data(simpleMIGData).withResult(perTagChoicesResult).init();

    ImageView.waitForImage();

    Choices.hasCheckedChoice("Choice 1");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.deep.include(perTagChoicesResult[0]);
      expect(result[0]).not.to.haveOwnProperty("item_index");
    });
  });

  it("should keep value between items", () => {
    LabelStudio.params().config(perTagMIGChoicesConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Choices.findChoice("Choice 2").click();
    Choices.hasCheckedChoice("Choice 2");

    ImageView.paginationNextBtn.click();

    Choices.hasCheckedChoice("Choice 2");
  });

  it("should require result", () => {
    LabelStudio.params().config(requiredPerTagMIGChoicesConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    ToolBar.updateBtn.click();
    Modals.hasWarning(CHOICES_REQUIRED_WARNING);
  });

  it("should not require result if there is one", () => {
    LabelStudio.params().config(requiredPerTagMIGChoicesConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Choices.findChoice("Choice 2").click();

    ToolBar.updateBtn.click();
    Modals.hasNoWarnings();
  });
});
describe("Control Tags - MIG perRegion - Choices", () => {
  it("should create result with item_index", () => {
    LabelStudio.params()
      .config(perRegionMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    Choices.findChoice("Choice 2").click();

    LabelStudio.serialize().then((result) => {
      expect(result.length).to.be.eq(3);
      expect(result[1]).to.include({
        type: "choices",
        item_index: 0,
      });
    });
  });

  it("should load result correctly", () => {
    LabelStudio.params()
      .config(perRegionMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult(perRegionChoicesResult)
      .init();

    ImageView.waitForImage();
    Sidebar.hasRegions(2);

    Sidebar.findRegionByIndex(0).click();

    Choices.hasCheckedChoice("Choice 2");

    LabelStudio.serialize().then((result) => {
      const { value, ...expectedResult } = perRegionChoicesResult[1];

      expect(result.length).to.be.eq(3);
      expect(result[1]).to.deep.include(expectedResult);
      expect(result[1].value.choices).to.be.deep.eq(value.choices);
    });
  });

  it("should require result", () => {
    LabelStudio.params()
      .config(requiredPerRegionMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.updateBtn.click();
    Modals.hasWarning(CHOICES_REQUIRED_WARNING);
  });

  it("should require result for other region too", () => {
    LabelStudio.params()
      .config(requiredPerRegionMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    Choices.findChoice("Choice 2").click();

    ToolBar.updateBtn.click();
    Modals.hasWarning(CHOICES_REQUIRED_WARNING);
  });

  it("should not require result if there are all of them", () => {
    LabelStudio.params()
      .config(requiredPerRegionMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Sidebar.findRegionByIndex(0).click();
    Choices.findChoice("Choice 2").click();

    Sidebar.findRegionByIndex(1).click();
    ImageView.waitForImage();
    Choices.findChoice("Choice 3").click();

    ToolBar.updateBtn.click();
    Modals.hasNoWarnings();
  });
});
describe("Control Tags - MIG perItem - Choices", () => {
  it("should create result with item_index", () => {
    LabelStudio.params().config(perItemMIGChoicesConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Choices.findChoice("Choice 2").click();

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.have.property("item_index", 0);
    });
  });

  it("should load perItem result correctly", () => {
    LabelStudio.params().config(perItemMIGChoicesConfig).data(simpleMIGData).withResult(perItemChoicesResult).init();

    ImageView.waitForImage();

    Choices.hasCheckedChoice("Choice 1");
    ImageView.paginationNextBtn.click();
    Choices.hasCheckedChoice("Choice 2");
    ImageView.paginationNextBtn.click();
    Choices.hasCheckedChoice("Choice 3");

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.deep.include(perItemChoicesResult[0]);
      expect(result[1]).to.deep.include(perItemChoicesResult[1]);
      expect(result[2]).to.deep.include(perItemChoicesResult[2]);
    });
  });

  it("should be able to create result for second item", () => {
    LabelStudio.params().config(perItemMIGChoicesConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Choices.findChoice("Choice 2").click();

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.have.property("item_index", 1);
    });
  });

  it("should be able to create more that one result", () => {
    LabelStudio.params().config(perItemMIGChoicesConfig).data(simpleMIGData).withResult([]).init();

    ImageView.waitForImage();

    Choices.findChoice("Choice 1").click();

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Choices.findChoice("Choice 2").click();

    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();
    Choices.findChoice("Choice 3").click();

    LabelStudio.serialize().then((result) => {
      expect(result[0]).to.include({ item_index: 0 });
      expect(result[0]).to.nested.include({ "value.choices[0]": "Choice 1" });

      expect(result[1]).to.include({ item_index: 1 });
      expect(result[1]).to.nested.include({ "value.choices[0]": "Choice 2" });

      expect(result[2]).to.include({ item_index: 2 });
      expect(result[2]).to.nested.include({ "value.choices[0]": "Choice 3" });
    });
  });

  it("should require result", () => {
    LabelStudio.params()
      .config(requiredPerItemMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    ToolBar.updateBtn.click();
    Modals.hasWarning(CHOICES_REQUIRED_WARNING);
  });

  it("should require result for other region too", () => {
    LabelStudio.params()
      .config(requiredPerItemMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Choices.findChoice("Choice 2").click();

    ToolBar.updateBtn.click();
    Modals.hasWarning(CHOICES_REQUIRED_WARNING);
  });

  it("should not require result if there are all of them", () => {
    LabelStudio.params()
      .config(requiredPerItemMIGChoicesConfig)
      .data(simpleMIGData)
      .withResult(perRegionRegionsResult)
      .init();

    ImageView.waitForImage();

    Choices.findChoice("Choice 2").click();
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Choices.findChoice("Choice 2").click();
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Choices.findChoice("Choice 2").click();
    ImageView.paginationNextBtn.click();
    ImageView.waitForImage();

    Choices.findChoice("Choice 2").click();

    ToolBar.updateBtn.click();
    Modals.hasNoWarnings();
  });
});

/* <Choices randomize="true" /> */
describe("Classification - Choices randomize attribute", () => {
  // 8 options ⇒ 8! permutations; 3 reloads matching is ~6e-10.
  const RANDOMIZE_CONFIG = `<View>
  <Image name="image" value="$image"/>
  <Choices name="choices" toName="image" randomize="true">
    <Choice value="Alpha" />
    <Choice value="Bravo" />
    <Choice value="Charlie" />
    <Choice value="Delta" />
    <Choice value="Echo" />
    <Choice value="Foxtrot" />
    <Choice value="Golf" />
    <Choice value="Hotel" />
  </Choices>
</View>`;

  const captureDisplayOrder = () =>
    cy
      .get(".lsf-choice__item .ant-checkbox + span, .lsf-choice__item .ant-radio + span")
      .then(($els) => Array.from($els).map((el) => el.textContent?.replace(/\[\w+\]$/, "").trim() ?? ""));

  it("renders all configured choices and serializes the configured value regardless of position", () => {
    LabelStudio.params().config(RANDOMIZE_CONFIG).data(simpleImageData).withResult([]).init();

    ImageView.waitForImage();

    captureDisplayOrder().then((order) => {
      expect(order).to.have.length(8);
      expect(order.sort()).to.deep.equal(
        ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel"].sort(),
      );
    });

    // The first-rendered Choice must serialize to its own configured value,
    // regardless of display position.
    cy.get(".lsf-choice__item")
      .first()
      .find(".ant-checkbox + span, .ant-radio + span")
      .invoke("text")
      .then((text) => {
        const label = text.replace(/\[\w+\]$/, "").trim();
        Choices.findChoice(label).click();
        LabelStudio.serialize().then((result) => {
          expect(result[0].value.choices).to.deep.equal([label]);
        });
      });
  });

  it("reshuffles option order on each task open", () => {
    LabelStudio.params().config(RANDOMIZE_CONFIG).data(simpleImageData).withResult([]).init();
    ImageView.waitForImage();

    captureDisplayOrder().then((firstOrder) => {
      LabelStudio.params().config(RANDOMIZE_CONFIG).data(simpleImageData).withResult([]).init();
      ImageView.waitForImage();
      captureDisplayOrder().then((secondOrder) => {
        LabelStudio.params().config(RANDOMIZE_CONFIG).data(simpleImageData).withResult([]).init();
        ImageView.waitForImage();
        captureDisplayOrder().then((thirdOrder) => {
          const allSame =
            JSON.stringify(firstOrder) === JSON.stringify(secondOrder) &&
            JSON.stringify(secondOrder) === JSON.stringify(thirdOrder);
          expect(allSame, "shuffle is ephemeral; order should change across reloads").to.equal(false);
        });
      });
    });
  });

  it("auto-assigned hotkey hints appear in display order (1, 2, 3, ...)", () => {
    LabelStudio.params().config(RANDOMIZE_CONFIG).data(simpleImageData).withResult([]).init();
    ImageView.waitForImage();

    cy.get(".lsf-choice__item").each(($item, index) => {
      const expectedHotkey = "1234567890qwetasdfgzxcvbyiopjklnm".split("")[index];
      cy.wrap($item).find(".lsf-hint").should("have.text", `[${expectedHotkey}]`);
    });
  });

  it("does not shuffle when randomize attribute is absent (regression guard)", () => {
    const STATIC_CONFIG = RANDOMIZE_CONFIG.replace('randomize="true"', "");
    LabelStudio.params().config(STATIC_CONFIG).data(simpleImageData).withResult([]).init();
    ImageView.waitForImage();

    captureDisplayOrder().then((firstOrder) => {
      expect(firstOrder).to.deep.equal(["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel"]);

      LabelStudio.params().config(STATIC_CONFIG).data(simpleImageData).withResult([]).init();
      ImageView.waitForImage();
      captureDisplayOrder().then((secondOrder) => {
        expect(secondOrder).to.deep.equal(firstOrder);
      });
    });
  });

  it("keeps display order and hotkeys aligned across repeated setupHotKeys() calls", () => {
    LabelStudio.params().config(RANDOMIZE_CONFIG).data(simpleImageData).withResult([]).init();
    ImageView.waitForImage();

    captureDisplayOrder().then((firstOrder) => {
      expect(firstOrder).to.have.length(8);

      // Re-enter setupHotKeys the same way `selectAnnotation` does on annotation switch.
      cy.window().then((win) => {
        // @ts-ignore — Htx is the LSF global, typed as any.
        win.Htx.annotationStore.selected.setupHotKeys();
      });

      captureDisplayOrder().then((secondOrder) => {
        expect(secondOrder, "display order must be stable across setupHotKeys re-entry").to.deep.equal(firstOrder);
      });

      cy.get(".lsf-choice__item").each(($item, index) => {
        const expectedHotkey = "1234567890qwetasdfgzxcvbyiopjklnm".split("")[index];
        cy.wrap($item)
          .find(".lsf-hint")
          .should("have.text", `[${expectedHotkey}]`, `[${expectedHotkey}] hint stays aligned with row ${index}`);
      });
    });
  });

  it("serializes the alias (not the visible label) when alias is configured", () => {
    const ALIAS_CONFIG = `<View>
  <Image name="image" value="$image"/>
  <Choices name="choices" toName="image" randomize="true">
    <Choice alias="pos" value="Positive" />
    <Choice alias="neu" value="Neutral" />
    <Choice alias="neg" value="Negative" />
  </Choices>
</View>`;

    LabelStudio.params().config(ALIAS_CONFIG).data(simpleImageData).withResult([]).init();
    ImageView.waitForImage();

    cy.get(".lsf-choice__item")
      .first()
      .find(".ant-checkbox + span, .ant-radio + span")
      .invoke("text")
      .then((text) => {
        const visibleLabel = text.replace(/\[\w+\]$/, "").trim();
        const aliasMap: Record<string, string> = { Positive: "pos", Neutral: "neu", Negative: "neg" };
        Choices.findChoice(visibleLabel).click();
        LabelStudio.serialize().then((result) => {
          expect(result[0].value.choices, "alias must be used in the serialized result").to.deep.equal([
            aliasMap[visibleLabel],
          ]);
        });
      });
  });

  it("interleaves shuffled Choice options with non-Choice siblings (Header) in their original positions", () => {
    // <Header> between Choice rows must stay where the config puts it; only
    // the Choice slots get shuffled. (Regression: previously the renderer
    // walked displayChildren only, dropping Header/View/HyperText entirely.)
    const INTERLEAVE_CONFIG = `<View>
  <Image name="image" value="$image"/>
  <Choices name="choices" toName="image" randomize="true">
    <Header value="Group A"/>
    <Choice value="A1" />
    <Choice value="A2" />
    <Header value="Group B"/>
    <Choice value="B1" />
    <Choice value="B2" />
  </Choices>
</View>`;

    LabelStudio.params().config(INTERLEAVE_CONFIG).data(simpleImageData).withResult([]).init();
    ImageView.waitForImage();

    // Both Headers must be present (in their config order).
    cy.contains(".lsf-choices h4, .lsf-choices h3, .lsf-choices h2, .lsf-choices h1", "Group A").should("exist");
    cy.contains(".lsf-choices h4, .lsf-choices h3, .lsf-choices h2, .lsf-choices h1", "Group B").should("exist");

    // All 4 Choice values are still rendered exactly once.
    captureDisplayOrder().then((order) => {
      expect(order).to.have.length(4);
      expect(order.sort()).to.deep.equal(["A1", "A2", "B1", "B2"]);
    });
  });

  it("keeps nested choices nested (allowNested + randomize) without duplicating them at the top level", () => {
    // Regression: tiedChildren is recursive, so an earlier displayChildren
    // implementation pulled nested children into the shuffle pool — they
    // ended up rendered both nested AND at the top level. Top-level shuffle
    // must only contain direct children.
    const NESTED_CONFIG = `<View>
  <Image name="image" value="$image"/>
  <Choices name="choices" toName="image" choice="multiple" allowNested="true" randomize="true">
    <Choice value="P1">
      <Choice value="C1a"/>
      <Choice value="C1b"/>
    </Choice>
    <Choice value="P2">
      <Choice value="C2a"/>
    </Choice>
  </Choices>
</View>`;

    LabelStudio.params().config(NESTED_CONFIG).data(simpleImageData).withResult([]).init();
    ImageView.waitForImage();

    // 5 unique choices total (2 parents + 3 children), each appearing exactly once.
    cy.get(".lsf-choice__item").should("have.length", 5);
    ["P1", "P2", "C1a", "C1b", "C2a"].forEach((value) => {
      cy.get(".lsf-choice__item")
        .filter((_, el) => (el.textContent ?? "").replace(/\[\w+\]$/, "").trim() === value)
        .should("have.length", 1);
    });
  });
});
