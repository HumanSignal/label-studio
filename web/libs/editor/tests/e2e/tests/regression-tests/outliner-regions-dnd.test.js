Feature("Outliner regions drag and drop").tag("@regress");

const CONFIG = `<View>
    <Labels name="label" toName="text">
        <Label value="Label" background="purple"/>
    </Labels>
    <Text name="text" value="$text" inline="true"/>
</View>`;

const TEXT = "qwertyuiopasdfghjklzxcvbnm";

function generateResults(n) {
  const results = [];

  for (let k = 0; k < n; k++) {
    results.push({
      id: `${k}`,
      from_name: "label",
      to_name: "text",
      type: "labels",
      origin: "manual",
      value: {
        start: k,
        end: k + 1,
        text: TEXT.split("")[k],
        labels: ["Label"],
      },
    });
  }
  return results;
}

Scenario("Dnd at the outliner after switching annotations", async ({ I, LabelStudio, AtOutliner }) => {
  I.amOnPage("/");
  LabelStudio.init({
    annotations: [
      {
        id: "test_02",
        result: generateResults(10),
      },
      {
        id: "test_01",
        result: generateResults(10),
      },
    ],
    config: CONFIG,
    data: { text: TEXT },
  });
  LabelStudio.waitForObjectsReady();
  I.waitTicks(2);
  I.waitForFunction(() => (window.Htx?.annotationStore?.selected?.regions?.length ?? 0) >= 10, 10);
  I.waitTicks(2);

  I.say("Check that drag and drop interaction works");
  await AtOutliner.dragAndDropRegion(7, 3);

  I.say("Switch annotation");
  I.click(locate(".lsf-annotation-button").at(2));
  I.waitTicks(5);
  LabelStudio.waitForObjectsReady();
  I.waitForFunction(() => (window.Htx?.annotationStore?.selected?.regions?.length ?? 0) >= 10, 10);
  I.waitTicks(2);

  I.say("Check that we still able to drag and drop regions");
  await AtOutliner.dragAndDropRegion(7, 3);

  // The potential errors should be caught by `errorsCollector` plugin
});
