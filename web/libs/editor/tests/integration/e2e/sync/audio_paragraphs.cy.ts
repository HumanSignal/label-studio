import { AudioView, LabelStudio } from "@humansignal/frontend-test/helpers/LSF";

const config = `
<View>
  <Audio name="audio" value="$url" hotkey="space" sync="text" />
  <Header value="Sentiment"/>
  <ParagraphLabels name="label" toName="text">
    <Label value="General: Positive" background="#00ff00"/>
    <Label value="General: Negative" background="#ff0000"/>
    <Label value="Company: Positive" background="#7dff7d"/>
    <Label value="Company: Negative" background="#ff7d7d"/>
    <Label value="External: Positive" background="#4bff4b"/>
    <Label value="External: Negative" background="#ff4b4b"/>
  </ParagraphLabels>
  <View style="height: 400px; overflow-y: auto">
    <Header value="Transcript"/>
    <Paragraphs audioUrl="$url" contextscroll="true" sync="audio" name="text" value="$text" layout="dialogue" textKey="text" nameKey="author" showplayer="true" />
  </View>
</View>
`;

const configWithScroll = `
<View>
    <Audio name="audio" value="$url"
           hotkey="space" sync="text"/>
    <Header value="Transcript"/>
    <Paragraphs audioUrl="$url"
                sync="audio"
                name="text"
                value="$text"
                layout="dialogue"
                textKey="text"
                nameKey="author"
                contextscroll="true"
                granularity="paragraph"/>
     <View style="position: sticky">
      <Header value="Sentiment Labels"/>
      <ParagraphLabels name="label" toName="text">
        <Label value="General: Positive" background="#00ff00"/>
        <Label value="General: Negative" background="#ff0000"/>
        <Label value="Company: Positive" background="#7dff7d"/>
        <Label value="Company: Negative" background="#ff7d7d"/>
        <Label value="External: Positive" background="#4bff4b"/>
        <Label value="External: Negative" background="#ff4b4b"/>
      </ParagraphLabels>
    </View>
</View>
`;

const data = {
  url: "/public/files/opossum_intro.webm",
  text: [
    {
      end: 3,
      text: "Dont you hate that?",
      start: 1,
      author: "Mia Wallace",
    },
    {
      text: "Hate what?",
      start: 3,
      author: "Vincent Vega:",
      duration: 1,
    },
    {
      text: "Uncomfortable silences. Why do we feel its necessary to yak about nonsense in order to be comfortable?",
      author: "Mia Wallace:",
      start: 4,
      end: 6,
    },
    {
      text: "I dont know. Thats a good question.",
      start: 6,
      end: 8,
      author: "Vincent Vega:",
    },
    {
      text: "Thats when you know you found somebody really special. When you can just shut the door closed a minute, and comfortably share silence.",
      author: "Mia Wallace:",
      start: 8,
      end: 10,
    },
    {
      text: "Thats when you know you found somebody really special. When you can just shut the door closed a minute, and comfortably share silence.",
      author: "Mia Wallace:",
      start: 10,
      end: 12,
    },
    {
      text: "Thats when you know you found somebody really special. When you can just shut the door closed a minute, and comfortably share silence.",
      author: "Mia Wallace:",
      start: 12,
      end: 16,
    },
    {
      text: "Thats when you know you found somebody really special. When you can just shut the door closed a minute, and comfortably share silence.",
      author: "Mia Wallace:",
      start: 16,
      end: 20,
    },
  ],
};

const annotations = [
  {
    value: {
      start: "0",
      end: "0",
      startOffset: 0,
      endOffset: 4,
      text: "Dont",
      paragraphlabels: ["General: Negative"],
    },
    id: "RcHv5CdYBt",
    from_name: "label",
    to_name: "text",
    type: "paragraphlabels",
    origin: "manual",
  },
  {
    value: {
      start: "0",
      end: "0",
      startOffset: 9,
      endOffset: 13,
      text: "hate",
      paragraphlabels: ["General: Positive"],
    },
    id: "eePG7PVYH7",
    from_name: "label",
    to_name: "text",
    type: "paragraphlabels",
    origin: "manual",
  },
];

describe("Sync: Audio Paragraphs", () => {
  beforeEach(() => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      ff_front_dev_2715_audio_3_280722_short: true,
      fflag_feat_front_lsdv_e_278_contextual_scrolling_short: true,
      fflag_feat_front_bros_199_enable_select_all_in_ner_phrase_short: false,
    });

    // expect uncaught exception for fast play/pause
    cy.on("uncaught:exception", () => false);
  });

  it("Play/pause is synced between audio and paragraphs when interacting with audio interface", () => {
    LabelStudio.params().config(config).data(data).withResult(annotations).init();

    LabelStudio.waitForObjectsReady();
    AudioView.isReady();

    cy.log("Audio is starting at 0");
    cy.get("audio").then(([audio]) => {
      expect(audio.currentTime).to.equal(0);
    });

    AudioView.playButton.click();
    AudioView.waitForPlayState(true, 8000, false);

    cy.log("Audio is playing");
    cy.get("audio").then(([audio]) => {
      expect(audio.paused).to.equal(false);
    });

    AudioView.pauseButton.click();
    AudioView.waitForPlayState(false, 8000, false);

    cy.log("Audio is played and now paused");
    cy.get("audio").then(([audio]) => {
      expect(audio.paused).to.equal(true);
    });
  });

  it("Seeking is synced between audio and paragraphs when interacting with audio interface", () => {
    LabelStudio.params().config(config).data(data).withResult(annotations).init();

    LabelStudio.waitForObjectsReady();
    AudioView.isReady();

    AudioView.clickAt(100, 0);
    cy.log("Seek by clicking on some point in the audio timeline");
    cy.get("audio").then(([audio]) => {
      expect(audio.currentTime).to.be.greaterThan(0);
    });

    AudioView.clickAt(0, 0);
    cy.log("Seek to beginning by clicking on the first point in the audio timeline");
    cy.get("audio").then(([audio]) => {
      expect(audio.currentTime).to.equal(0);
    });

    AudioView.clickAt(300, 0);
    cy.log("Seek by clicking on some point further in the audio timeline");
    cy.get("audio").then(([audio]) => {
      expect(audio.currentTime).to.be.greaterThan(0);
    });
  });

  it("Playback speed is synced between audio and paragraph audio when interacting with audio interface", () => {
    LabelStudio.params().config(config).data(data).withResult(annotations).init();

    LabelStudio.waitForObjectsReady();
    AudioView.isReady();

    // Get the main audio player and first paragraph audio
    cy.get('[data-testid="waveform-audio"]').then(([mainAudio]) => {
      cy.get(".lsf-paragraphs audio").then(([paragraphAudio]) => {
        const mainAudioElement = mainAudio as HTMLAudioElement;
        const paragraphAudioElement = paragraphAudio as HTMLAudioElement;

        expect(mainAudioElement.currentTime).to.equal(paragraphAudioElement.currentTime);
        expect(mainAudioElement.currentTime).to.equal(0);
        expect(mainAudioElement.playbackRate).to.equal(paragraphAudioElement.playbackRate);
        expect(mainAudioElement.playbackRate).to.equal(1);
      });
    });

    // Set playback speed before playing
    AudioView.setPlaybackSpeedInput(1.5, false); // false = audio-only, don't check video
    AudioView.playButton.click();
    AudioView.waitForPlayState(true, 8000, false);

    // Check sync during playback
    cy.get('[data-testid="waveform-audio"]').then(([mainAudio]) => {
      cy.get(".lsf-paragraphs audio").then(([paragraphAudio]) => {
        const mainAudioElement = mainAudio as HTMLAudioElement;
        const paragraphAudioElement = paragraphAudio as HTMLAudioElement;

        expect(mainAudioElement.playbackRate).to.equal(paragraphAudioElement.playbackRate);
        expect(mainAudioElement.playbackRate).to.equal(1.5);
      });
    });

    // Change speed during playback
    AudioView.setPlaybackSpeedInput(1, false); // false = audio-only, don't check video
    AudioView.waitForPlaybackRate(1, 8000, false);

    // Check sync after speed change
    cy.get('[data-testid="waveform-audio"]').then(([mainAudio]) => {
      cy.get(".lsf-paragraphs audio").then(([paragraphAudio]) => {
        const mainAudioElement = mainAudio as HTMLAudioElement;
        const paragraphAudioElement = paragraphAudio as HTMLAudioElement;

        expect(mainAudioElement.playbackRate).to.equal(paragraphAudioElement.playbackRate);
        expect(mainAudioElement.playbackRate).to.equal(1);
      });
    });

    // Check final sync
    cy.get('[data-testid="waveform-audio"]').then(([mainAudio]) => {
      cy.get(".lsf-paragraphs audio").then(([paragraphAudio]) => {
        const mainAudioElement = mainAudio as HTMLAudioElement;
        const paragraphAudioElement = paragraphAudio as HTMLAudioElement;

        expect(mainAudioElement.currentTime).to.be.closeTo(paragraphAudioElement.currentTime, 0.4);
      });
    });
  });

  it("Play/pause is synced between audio and paragraphs when interacting with paragraph interface", () => {
    LabelStudio.params().config(config).data(data).withResult(annotations).init();

    LabelStudio.waitForObjectsReady();
    AudioView.isReady();

    cy.log("Audio is starting at 0");
    cy.get("audio").then(([audio]) => {
      expect(audio.currentTime).to.equal(0);
    });

    cy.get('[data-testid="phrase:0"]').siblings('button[aria-label="play"]').click();
    AudioView.waitForPlayState(true, 8000, false);

    cy.log("Audio is playing");
    cy.get("audio").then(([audio]) => {
      expect(audio.paused).to.equal(false);
    });

    cy.get('[data-testid="phrase:0"]').siblings('button[aria-label="pause"]').click();
    AudioView.waitForPlayState(false, 8000, false);

    cy.log("Audio is played and now paused");
    cy.get("audio").then(([audio]) => {
      expect(audio.paused).to.equal(true);
    });
  });

  it("Audio clip is played when selecting the play button next to a paragraph segment", () => {
    LabelStudio.params().config(config).data(data).withResult(annotations).init();

    LabelStudio.waitForObjectsReady();
    AudioView.isReady();

    cy.get("audio").then(([audio]) => {
      expect(audio.currentTime).to.equal(0);
    });

    cy.get('[data-testid="phrase:0"]').siblings('button[aria-label="play"]').click();
    AudioView.waitForPlayState(true, 8000, false);

    cy.get("audio").then(([audio]) => {
      expect(audio.currentTime).to.not.equal(0);
    });

    cy.get('[data-testid="phrase:1"]').siblings('button[aria-label="play"]').click();
    AudioView.waitForPlayState(true, 8000, false);

    cy.get("audio").then(([audio]) => {
      expect(audio.currentTime).to.not.equal(0);
    });
  });

  it("Playback button states continually change over time according to the paragraph segment which is being played", () => {
    LabelStudio.params().config(config).data(data).withResult(annotations).init();

    LabelStudio.waitForObjectsReady();
    AudioView.isReady();

    cy.get("audio").then(([audio]) => {
      expect(audio.currentTime).to.equal(0);
    });

    AudioView.playButton.click();

    // Plays the first paragraph segment when the audio interface is played
    cy.get('[data-testid="phrase:0"]').siblings('button[aria-label="pause"]').should("exist");
    cy.get('[data-testid="phrase:1"]').siblings('button[aria-label="play"]').should("exist");
    cy.get('[data-testid="phrase:2"]').siblings('button[aria-label="play"]').should("exist");
    cy.get('[data-testid="phrase:3"]').siblings('button[aria-label="play"]').should("exist");
    cy.get('[data-testid="phrase:4"]').siblings('button[aria-label="play"]').should("exist");

    // Wait for playback to progress to second segment (phrase:1 shows pause)
    cy.get('[data-testid="phrase:1"]').siblings('button[aria-label="pause"]').should("exist");
    cy.get('[data-testid="phrase:0"]').siblings('button[aria-label="play"]').should("exist");
    cy.get('[data-testid="phrase:2"]').siblings('button[aria-label="play"]').should("exist");
    cy.get('[data-testid="phrase:3"]').siblings('button[aria-label="play"]').should("exist");
    cy.get('[data-testid="phrase:4"]').siblings('button[aria-label="play"]').should("exist");

    // Wait for playback to progress to third segment (phrase:2 shows pause)
    cy.get('[data-testid="phrase:2"]').siblings('button[aria-label="pause"]').should("exist");
    cy.get('[data-testid="phrase:0"]').siblings('button[aria-label="play"]').should("exist");
    cy.get('[data-testid="phrase:1"]').siblings('button[aria-label="play"]').should("exist");
    cy.get('[data-testid="phrase:3"]').siblings('button[aria-label="play"]').should("exist");
    cy.get('[data-testid="phrase:4"]').siblings('button[aria-label="play"]').should("exist");
  });

  it("Check if paragraph is scrolling automatically following the audio", () => {
    LabelStudio.params().config(configWithScroll).data(data).withResult(annotations).init();

    LabelStudio.waitForObjectsReady();
    AudioView.isReady();

    // Inject CSS to force scrolling in test environment
    // cy.get("head").invoke(
    //   "append",
    //   `<style>
    //     [data-testid="phrases-wrapper"] {
    //       max-height: 120px !important;
    //       overflow-y: auto !important;
    //     }
    //   </style>`,
    // );

    cy.get("audio").then(([audio]) => {
      expect(audio.currentTime).to.equal(0);
    });

    AudioView.playButton.click();
    // Auto-scroll needs time to move; no stable DOM signal for "scrolled enough"
    cy.wait(5100);

    cy.get('[data-testid="phrases-wrapper"]').then(($el) => {
      expect($el[0].scrollTop).to.be.greaterThan(100);
    });
  });

  it("Paragraph should automatically scroll if user seeks audio player", () => {
    LabelStudio.params().config(configWithScroll).data(data).withResult(annotations).init();

    LabelStudio.waitForObjectsReady();
    AudioView.isReady();

    cy.get("audio").then(([audio]) => {
      expect(audio.currentTime).to.equal(0);
    });

    AudioView.playButton.click();
    cy.wait(3000);

    AudioView.clickAt(0, 0);
    cy.wait(1000);

    AudioView.pauseButton.click();
    cy.wait(1000);

    cy.get('[data-testid="phrases-wrapper"]').then(($el) => {
      const scrollTop = $el[0].scrollTop;
      // Expect small padding for visual breathing room (should be greater than 0 but less than 20)
      expect(scrollTop).to.be.greaterThan(0);
      expect(scrollTop).to.be.lessThan(20);
    });
  });

  it("Paragraph shouldnt automatically scroll if user disable the auto-scroll toggle", () => {
    LabelStudio.params().config(configWithScroll).data(data).withResult(annotations).init();

    LabelStudio.waitForObjectsReady();
    AudioView.isReady();

    cy.get("audio").then(([audio]) => {
      expect(audio.currentTime).to.equal(0);
    });

    cy.get('[data-testid="auto-scroll-toggle"]').click();
    AudioView.playButton.click();
    // Wait for playback; with auto-scroll off, scrollTop should stay 0
    AudioView.waitForPlayState(true, 8000, false);

    cy.get('[data-testid="phrases-wrapper"]').then(($el) => {
      expect($el[0].scrollTop).to.equal(0);
    });
  });

  it("Paragraph shouldnt automatically scroll if user manually scroll and the current paragraph is not in the screen", () => {
    LabelStudio.params().config(configWithScroll).data(data).withResult(annotations).init();

    LabelStudio.waitForObjectsReady();
    AudioView.isReady();

    cy.get("audio").then(([audio]) => {
      expect(audio.currentTime).to.equal(0);
    });

    AudioView.playButton.click();
    AudioView.waitForStableState();

    cy.get('[data-testid="phrases-wrapper"]').then(($el) => {
      $el[0].scrollTo(0, 1000);
      const wheelEvt = new WheelEvent("wheel", { deltaY: 1200 });
      $el[0].dispatchEvent(wheelEvt);
    });

    // Wait for scroll position to reflect manual scroll
    cy.get('[data-testid="phrases-wrapper"]').should(($el) => {
      expect($el[0].scrollTop).to.be.greaterThan(190);
    });
  });
});
