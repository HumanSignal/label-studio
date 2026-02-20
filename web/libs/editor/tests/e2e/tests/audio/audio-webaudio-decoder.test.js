Feature("Audio WebAudio Decoder");

const config = `
<View>
  <Header value="Select regions:"></Header>
  <Labels name="label" toName="audio" choice="multiple">
    <Label value="Beat" background="yellow"></Label>
    <Label value="Voice" background="red"></Label>
    <Label value="Guitar" background="blue"></Label>
    <Label value="Other"></Label>
  </Labels>
  <Header value="Select genre:"></Header>
  <Choices name="choice" toName="audio" choice="multiple">
    <Choice value="Lo-Fi" />
    <Choice value="Rock" />
    <Choice value="Pop" />
  </Choices>
  <Header value="Listen the audio:"></Header>
  <Audio name="audio" value="$url"></Audio>
</View>
`;

const configSpeech = `
<View>
    <Audio name="audio" value="$url" decoder="webaudio"></Audio>
    <Labels name="label" toName="audio">
      <Label value="Speech"/>
      <Label value="Noise" background="grey"/>
    </Labels>
    <TextArea name="transcription" toName="audio"
              perRegion="true" whenTagName="label" whenLabelValue="Speech"
              displayMode="region-list"/>
    <Choices name="sentiment" toName="audio" showInline="true"
             perRegion="true" whenTagName="label" whenLabelValue="Speech">
        <Choice value="Positive"/>
        <Choice value="Neutral"/>
        <Choice value="Negative"/>
    </Choices>
  </View>
`;

const data = {
  url: "/public/files/barradeen-emotional.mp3",
};

const annotations = [
  {
    from_name: "choice",
    id: "hIj6zg57SY",
    to_name: "audio",
    type: "choices",
    origin: "manual",
    value: {
      choices: ["Lo-Fi"],
    },
  },
  {
    from_name: "label",
    id: "JhxupEJWlW",
    to_name: "audio",
    original_length: 98.719925,
    type: "labels",
    origin: "manual",
    value: {
      channel: 1,
      end: 59.39854733358493,
      labels: ["Other"],
      start: 55.747572792986325,
    },
  },
];

const params = { annotations: [{ id: "test", result: annotations }], config, data };
const paramsSpeech = { annotations: [{ id: "test", result: [] }], config: configSpeech, data };

Scenario("Check if regions are selected", async ({ I, LabelStudio, AtAudioView, AtOutliner }) => {
  LabelStudio.setFeatureFlags({
    ff_front_dev_2715_audio_3_280722_short: true,
  });
  I.amOnPage("/");

  LabelStudio.init(params);

  await AtAudioView.waitForAudio();

  I.waitForDetached("loading-progress-bar", 30);

  await AtAudioView.lookForStage();

  AtOutliner.seeRegions(1);

  // creating a new region
  I.pressKey("1");
  AtAudioView.dragAudioElement(160, 80);
  I.pressKey("u");

  AtOutliner.seeRegions(2);

  AtAudioView.clickAt(170);
  AtOutliner.seeSelectedRegion();
  AtAudioView.clickAt(170);
  AtOutliner.dontSeeSelectedRegion();
  AtAudioView.dragAudioElement(170, 40);
  AtOutliner.seeSelectedRegion();
  AtAudioView.clickAt(220);
  AtOutliner.dontSeeSelectedRegion();
});

Scenario(
  "Check if multiple regions are working changing labels",
  async ({ I, LabelStudio, AtAudioView, AtOutliner }) => {
    LabelStudio.setFeatureFlags({
      ff_front_dev_2715_audio_3_280722_short: true,
    });
    I.amOnPage("/");

    LabelStudio.init(paramsSpeech);

    await AtAudioView.waitForAudio();

    I.waitForDetached("loading-progress-bar", 30);

    await AtAudioView.lookForStage();

    const regionCount = 5;

    for (let i = 0; i < regionCount; i++) {
      I.pressKey("1");
      AtAudioView.dragAudioElement(60 * i + 10, 40);
      I.wait(0.5);
      AtAudioView.clickAt(60 * i + 25);
      I.pressKey("2");
      I.pressKey("1");
      I.pressKey("u");
      I.wait(0.5);
    }

    AtOutliner.seeRegions(regionCount);

    for (let i = 0; i < regionCount; i++) {
      AtAudioView.clickAt(60 * i + 25);
      AtOutliner.seeSelectedRegion();
      I.pressKey("u");
    }

    AtOutliner.seeRegions(regionCount);

    I.pressKey("u");

    AtOutliner.dontSeeSelectedRegion();
  },
)
  .tag("@flakey")
  .retry(3);

Scenario("Can select a region below a hidden region", async ({ I, LabelStudio, AtAudioView, AtOutliner }) => {
  LabelStudio.setFeatureFlags({
    ff_front_dev_2715_audio_3_280722_short: true,
  });
  I.amOnPage("/");

  LabelStudio.init(paramsSpeech);

  await AtAudioView.waitForAudio();

  I.waitForDetached("loading-progress-bar", 30);

  await AtAudioView.lookForStage();

  // create a new region with label "Speech" (wider area for reliable clicking)
  I.pressKey("1");
  AtAudioView.dragAudioElement(40, 120);
  I.wait(1);
  I.pressKey("u");
  I.wait(0.5);

  AtOutliner.seeRegions(1);

  // create a new region above the first one with label "Noise"
  I.pressKey("2");
  AtAudioView.dragAudioElement(35, 130);
  I.wait(1);
  I.pressKey("u");
  I.wait(0.5);

  AtOutliner.seeRegions(2);

  // click on the overlapping area to select the top-most region
  AtAudioView.clickAt(80);
  I.wait(0.5);
  AtOutliner.seeSelectedRegion("Noise");

  // hide the Noise region via script to avoid hover unreliability
  I.pressKey("u");
  I.wait(0.3);
  await I.executeScript(() => {
    const annotation = window.Htx.annotationStore.selected;
    const noiseRegion = annotation.regions.find((r) => {
      const labeling = r.labeling;
      return labeling && labeling.mainValue && labeling.mainValue.includes("Noise");
    });
    if (noiseRegion) noiseRegion.toggleHidden();
  });
  I.wait(0.5);

  // click on the region below the hidden one to select it
  AtAudioView.clickAt(80);
  I.wait(0.5);
  AtOutliner.seeSelectedRegion("Speech");
})
  .tag("@flakey")
  .retry(3);

Scenario("Delete region by pressing delete hotkey", async ({ I, LabelStudio, AtAudioView, AtOutliner }) => {
  LabelStudio.setFeatureFlags({
    ff_front_dev_2715_audio_3_280722_short: true,
  });
  I.amOnPage("/");

  LabelStudio.init(params);

  await AtAudioView.waitForAudio();

  I.waitForDetached("loading-progress-bar", 30);

  await AtAudioView.lookForStage();

  AtOutliner.seeRegions(1);

  // creating a new region
  AtAudioView.dragAudioElement(160, 80);

  I.pressKey("Delete");

  I.pressKey("1");

  AtOutliner.seeRegions(1);
});

Scenario("Check if there are ghost regions", async ({ I, LabelStudio, AtAudioView, AtOutliner }) => {
  LabelStudio.setFeatureFlags({
    ff_front_dev_2715_audio_3_280722_short: true,
  });
  I.amOnPage("/");

  LabelStudio.init(paramsSpeech);

  await AtAudioView.waitForAudio();

  I.waitForDetached("loading-progress-bar", 30);

  await AtAudioView.lookForStage();

  // creating a new region
  I.pressKey("1");
  AtAudioView.dragAudioElement(300, 80);
  I.pressKey("u");

  // creating a ghost region
  I.pressKey("1");
  AtAudioView.dragAudioElement(160, 80, false);
  I.pressKey("1");
  I.waitTicks(2);
  I.pressMouseUp();
  I.waitTicks(2);

  // checking if the created region is selected
  AtAudioView.clickAt(310);
  AtOutliner.seeSelectedRegion();

  // trying to select the ghost region, if there is no ghost region, the region will keep selected
  // as ghost region is not selectable and impossible to change the label, the created region will be deselected if there is a ghost region created.
  AtAudioView.clickAt(170);
  I.pressKey("2");
  AtOutliner.seeSelectedRegion();

  AtOutliner.seeRegions(2);
});
