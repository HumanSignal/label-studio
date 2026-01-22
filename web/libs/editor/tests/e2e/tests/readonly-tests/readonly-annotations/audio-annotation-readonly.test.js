Feature("Readonly Annotation");

const imageExamples = new DataTable(["example", "regionName"]);

imageExamples.add([require("../../../examples/audio-regions"), "Beat"]);

Data(imageExamples).Scenario(
  "Audio Readonly Annotations",
  async ({ I, current, LabelStudio, AtOutliner, AtAudioView }) => {
    I.amOnPage("/");
    const { config, result, data } = current.example;
    const regions = result.filter((r) => {
      return r.type.match("labels");
    });

    const params = {
      annotations: [
        {
          id: "test",
          readonly: true,
          result,
        },
      ],
      config,
      data,
    };

    LabelStudio.init(params);

    await AtAudioView.waitForAudio();
    I.waitTicks(3); // Wait for audio regions to be fully interactive

    I.say("Check region is selectable");
    AtOutliner.seeRegions(regions.length);
    AtOutliner.clickRegion(current.regionName);
    I.waitTicks(3); // Wait for region selection to complete

    const regionId = regions[0].id;

    await AtAudioView.moveRegion(regionId, 100);

    I.say("Results are equal after modification attempt");
    await LabelStudio.resultsNotChanged(result);

    I.pressKey("Backspace");
    I.say("Results are equal after deletion attempt");
    await LabelStudio.resultsNotChanged(result);

    I.say("Can't draw new shape");
    I.pressKey("1");

    await AtAudioView.createRegion("audio", 50, 100);
    AtOutliner.seeRegions(regions.length);
  },
);
