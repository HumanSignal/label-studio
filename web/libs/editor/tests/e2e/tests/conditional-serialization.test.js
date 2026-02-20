const assert = require("assert");
const { serialize } = require("./helpers");

const config = `
<View>
  <Text name="text" value="$text"/>
  <Choices name="parentChoice" toName="text" choice="single">
      <Choice value="A"/>
      <Choice value="B"/>
  </Choices>

  <View visibleWhen="choice-selected" whenTagName="parentChoice" whenChoiceValue="A">
      <Choices name="nestedChoice" toName="text" choice="single">
          <Choice value="X"/>
          <Choice value="Y"/>
      </Choices>
      <TextArea name="details" toName="text"/>
  </View>
</View>
`;

const data = {
  text: "The quick brown fox jumps over the lazy dog",
};

Feature("Conditional Serialization");

Scenario("TextArea should not be serialized when parent View is not visible", async ({ I, LabelStudio }) => {
  I.amOnPage("/");
  LabelStudio.init({ config, data, annotations: [{ id: "1", result: [] }], taskId: 1 });
  LabelStudio.waitForObjectsReady();

  I.say("Check initial state - nested elements should not be visible");
  I.dontSee("X");
  I.dontSee("Y");
  I.dontSeeElement('[data-testid="textarea-control"]');

  I.say("Select choice A to show nested elements");
  I.click(locate(".lsf-choice").withText("A"));

  I.say("Check if nested elements are now visible");
  I.see("X");
  I.see("Y");

  I.say("Add text to the details textarea");
  I.fillField("details", "Some important details");
  I.pressKey("Enter");

  I.say("Select choice B to hide nested elements");
  I.click(locate(".lsf-choice").withText("B"));

  I.say("Check that nested elements are hidden again");
  I.dontSee("X");
  I.dontSee("Y");
  I.dontSeeElement('[data-testid="textarea-control"]');

  I.wait(1);
  I.say("Check serialization - details should not be included");
  const result = await LabelStudio.serialize();

  // Check that the details textarea is not in the serialized result
  const hasDetails = result.some((r) => r.from_name.name === "details");
  assert.strictEqual(hasDetails, false, "Details textarea should not be serialized when parent View is not visible");
});
