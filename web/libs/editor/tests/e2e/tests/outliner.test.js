const assert = require("assert");
const { centerOfBbox } = require("./helpers");

Feature("Outliner");

const IMAGE = "/public/files/images/nick-owuor-unsplash.jpg";

Scenario("Basic details", async ({ I, LabelStudio, AtOutliner, AtDetails }) => {
  const RESULT_LABELS = ["a", "b", "c"];
  const getRectangleRegion = (results) => {
    const region = results.find((item) => item.from_name === "rect" && item.type === "rectangle");

    assert(region, "Rectangle region not found in serialized results");
    return region;
  };
  const result = [
    {
      value: {
        start: 0,
        end: 4,
        labels: ["a", "b", "c"],
      },
      id: "test_t_1",
      from_name: "label",
      to_name: "text",
      type: "labels",
    },
    {
      value: {
        start: 5,
        end: 6,
        labels: [],
      },
      id: "test_t_2",
      from_name: "label",
      to_name: "text",
      type: "labels",
    },
    {
      value: {
        x: 25,
        y: 25,
        width: 50,
        height: 50,
      },
      id: "test_i_1",
      from_name: "rect",
      to_name: "img",
      type: "rectangle",
    },
    {
      original_width: 2242,
      original_height: 2802,
      image_rotation: 0,
      value: {
        x: 25,
        y: 25,
        width: 50,
        height: 50,
        rotation: 0,
      },
      id: "test_i_1",
      from_name: "rect",
      to_name: "img",
      type: "rectangle",
      origin: "manual",
    },
    {
      original_width: 2242,
      original_height: 2802,
      image_rotation: 0,
      value: {
        x: 25,
        y: 25,
        width: 50,
        height: 50,
        rotation: 0,
        rating: 4,
      },
      id: "test_i_1",
      from_name: "rating",
      to_name: "img",
      type: "rating",
      origin: "manual",
    },
    {
      original_width: 2242,
      original_height: 2802,
      image_rotation: 0,
      value: {
        x: 25,
        y: 25,
        width: 50,
        height: 50,
        rotation: 0,
        text: ["text", "area"],
      },
      id: "test_i_1",
      from_name: "textarea",
      to_name: "img",
      type: "textarea",
      origin: "manual",
    },
    {
      original_width: 2242,
      original_height: 2802,
      image_rotation: 0,
      value: {
        x: 25,
        y: 25,
        width: 50,
        height: 50,
        rotation: 0,
        choices: ["option 1", "option 2"],
      },
      id: "test_i_1",
      from_name: "choices",
      to_name: "img",
      type: "choices",
      origin: "manual",
    },
  ];
  const fillByPressKeyDown = (keysList) => {
    for (const keys of keysList) {
      for (let idx = 0; idx < keys.length; idx++) {
        I.pressKeyDown(keys[idx]);
      }
      for (let idx = keys.length - 1; idx >= 0; idx--) {
        I.pressKeyUp(keys[idx]);
      }
    }
  };

  I.amOnPage("/");

  LabelStudio.init({
    config: `
<View>
  <Text name="text" value="$text"/>
  <Labels name="label" toName="text" choice="multiple">
    <Label value="a" hotkey="1" />
    <Label value="b" hotkey="2" />
    <Label value="c" hotkey="3" />
  </Labels>
  <Image name="img" value="$image"/>
  <Rectangle name="rect" toName="img"/>
  <Rating name="rating" toName="img" perRegion="true"/>
  <Textarea name="textarea" toName="img" perRegion="true"/>
  <Choices name="choices" toName="img" perRegion="true">
    <Choice value="option 1"/>
    <Choice value="option 2"/>
  </Choices>
</View>
`,
    data: {
      text: "Just a text",
      image: IMAGE,
    },
    annotations: [
      {
        id: "test",
        result,
      },
    ],
  });

  AtOutliner.seeRegions(3);
  LabelStudio.waitForObjectsReady();

  I.say("Select text region");
  AtOutliner.clickRegion(1);
  I.say("Check it's details");
  for (const value of RESULT_LABELS) {
    AtDetails.seeLabel(value);
  }
  AtDetails.seeLabels(RESULT_LABELS.length);
  AtDetails.seeText("Just");

  I.say("Select second text region");
  AtOutliner.clickRegion(2);
  I.say("Check it's details");
  AtDetails.seeLabels(0);
  AtDetails.seeText("a");

  I.say("Select image region");
  AtOutliner.clickRegion(3);

  AtDetails.seeFieldWithValue("X", "25");
  AtDetails.seeFieldWithValue("H", "50");

  I.say("Check perregions displaying");

  AtDetails.seeResultRating(4);
  AtDetails.seeResultTextarea(["text", "area"]);
  AtDetails.seeResultChoices(["option 1", "option 2"]);

  I.say("Add new meta and check result");
  AtDetails.clickEditMeta();

  fillByPressKeyDown([["M"], ["Space"], ["1"], ["Shift", "Enter"], ["M"], ["Space"], ["2"], ["Enter"]]);
  AtDetails.seeMeta("M 1");
  AtDetails.seeMeta("M 2");

  I.say("Add line to meta");
  AtDetails.clickMeta();
  fillByPressKeyDown([["Shift", "Enter"], ["3"], ["Enter"]]);
  AtDetails.seeMeta("3");
  AtDetails.dontSeeMeta("23");

  I.say("Check that meta is saved correctly");
  const resultWithMeta = await LabelStudio.serialize();
  const regionWithMeta = getRectangleRegion(resultWithMeta);

  assert.deepStrictEqual(regionWithMeta.meta?.text, ["M 1\nM 2\n3"]);

  I.say("Remove meta");
  AtDetails.clickMeta();
  fillByPressKeyDown([["CommandOrControl", "a"], ["Backspace"], ["Enter"]]);

  I.say("Check that meta is removed correctly");
  const resultWithoutMeta = await LabelStudio.serialize();
  const regionWithoutMeta = getRectangleRegion(resultWithoutMeta);

  assert.deepStrictEqual(resultWithoutMeta[2].meta, undefined);
}).retry(3);

Scenario("Panels manipulations", async ({ I, LabelStudio, AtPanels }) => {
  I.amOnPage("/");
  LabelStudio.init({
    config: `
<View>
  <Text name="text" value="$text"/>
</View>
`,
    data: {
      text: "Just a text",
    },
    annotations: [
      {
        id: "test",
        result: [],
      },
    ],
  });
  LabelStudio.waitForObjectsReady();

  const AtOutlinerPanel = AtPanels.usePanel(AtPanels.PANEL.OUTLINER);
  const AtDetailsPanel = AtPanels.usePanel(AtPanels.PANEL.DETAILS);

  I.say("See panels at default positions");
  AtOutlinerPanel.seePanelAttachedRight();
  AtDetailsPanel.seePanelAttachedRight();

  I.say("They should be fully visible");
  AtOutlinerPanel.seePanelBody();
  AtDetailsPanel.seePanelBody();
  I.say("and not collapsed");
  AtOutlinerPanel.dontSeeExpandButton();
  AtDetailsPanel.dontSeeExpandButton();

  I.say("Collapse both panels");
  AtOutlinerPanel.collapsePanel();

  I.say("Make sure there is no body or collapse button");
  AtOutlinerPanel.dontSeePanelBody();
  AtOutlinerPanel.dontSeeСollapseButton();
  AtOutlinerPanel.seeExpandButton();

  I.say("Expand both panels");
  AtOutlinerPanel.expandPanel();
  AtDetailsPanel.expandPanel();

  I.say("Make sure that body and collapse appears");
  AtOutlinerPanel.seePanelBody();
  AtDetailsPanel.seePanelBody();
  AtOutlinerPanel.seeСollapseButton();
  AtDetailsPanel.seeСollapseButton();
  AtOutlinerPanel.dontSeeExpandButton();
  AtDetailsPanel.dontSeeExpandButton();

  I.say("Collapse and expand are still working");
  AtDetailsPanel.collapsePanel();
  AtDetailsPanel.dontSeePanelBody();
  AtDetailsPanel.seeExpandButton();
  AtDetailsPanel.expandPanel();
  AtDetailsPanel.seePanelBody();
});
