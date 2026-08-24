/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  AudioView,
  ImageView,
  Labels,
  LabelStudio,
  Sidebar,
  TimeSeries,
  VideoView,
} from "@humansignal/frontend-test/helpers/LSF";
import { RichText } from "@humansignal/frontend-test/helpers/LSF/RichText";
import { Paragraphs } from "@humansignal/frontend-test/helpers/LSF/Paragraphs";
import {
  imageRectangleLabelsConfig,
  imagePolygonLabelsConfig,
  richTextLabelsConfig,
  paragraphsLabelsConfig,
  audioLabelsConfig,
  timeseriesLabelsConfig,
  videoLabelsConfig,
  videoTimelineLabelsConfig,
  hyperTextLabelsConfig,
  testImageData,
  testTextData,
  testHyperTextData,
  testParagraphsData,
  testAudioData,
  testTimeseriesData,
  testVideoData,
} from "../../data/labels/multiple-label-blocks";

describe("Multiple Label Blocks - All Object Tags", () => {
  beforeEach(() => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      fflag_fix_front_dev_3391_interactive_view_all: true,
    });
  });
  describe("Image Object Tag", () => {
    it("should create separate results for each label block - RectangleLabels", () => {
      cy.log("Initialize LSF with Image and multiple RectangleLabels blocks");
      LabelStudio.params()
        .config(imageRectangleLabelsConfig)
        .data(testImageData)
        .withResult([])
        .withParam("settings", { continuousLabeling: false })
        .init();

      LabelStudio.waitForObjectsReady();
      ImageView.waitForImage();
      Sidebar.hasNoRegions();

      cy.log("Select labels from different blocks");
      Labels.select("Circle"); // From shapes block
      Labels.select("Star"); // From objects block
      Labels.select("Visible"); // From general block

      cy.log("Draw a rectangle region");
      ImageView.drawRectRelative(0.1, 0.1, 0.3, 0.3);

      cy.log("Verify region was created");
      Sidebar.hasRegions(1);

      cy.log("Verify separate results for each label block");
      LabelStudio.serialize().then((results) => {
        expect(results).to.have.length(3);

        // Check results from each block
        const shapesResult = results.find((r: any) => r.from_name === "shapes");
        const objectsResult = results.find((r: any) => r.from_name === "objects");
        const generalResult = results.find((r: any) => r.from_name === "general");

        expect(shapesResult).to.exist;
        expect(objectsResult).to.exist;
        expect(generalResult).to.exist;

        expect(shapesResult.value.rectanglelabels).to.include("Circle");
        expect(objectsResult.value.rectanglelabels).to.include("Star");
        expect(generalResult.value.labels).to.include("Visible");

        // All results should have the same region coordinates
        expect(shapesResult.value.x).to.approximately(objectsResult.value.x, 1);
        expect(shapesResult.value.y).to.approximately(objectsResult.value.y, 1);
      });
    });

    it("should create separate results for each label block - PolygonLabels", () => {
      cy.log("Initialize LSF with Image and multiple PolygonLabels blocks");
      LabelStudio.params()
        .config(imagePolygonLabelsConfig)
        .data(testImageData)
        .withResult([])
        .withParam("settings", { continuousLabeling: false })
        .init();

      LabelStudio.waitForObjectsReady();
      ImageView.waitForImage();
      Sidebar.hasNoRegions();

      cy.log("Select labels from different polygon blocks");
      Labels.select("Area1"); // From areas block
      Labels.select("Region1"); // From regions block
      Labels.select("Tagged"); // From tags block

      cy.log("Draw a polygon region");
      // Draw polygon with multiple points
      ImageView.clickAtRelative(0.2, 0.2);
      ImageView.clickAtRelative(0.4, 0.2);
      ImageView.clickAtRelative(0.4, 0.4);
      ImageView.clickAtRelative(0.2, 0.4);
      // Close polygon by clicking on first point
      ImageView.clickAtRelative(0.2, 0.2);

      cy.log("Verify region was created");
      Sidebar.hasRegions(1);

      cy.log("Verify separate results for each polygon label block");
      LabelStudio.serialize().then((results) => {
        expect(results).to.have.length(3);

        const areasResult = results.find((r: any) => r.from_name === "areas");
        const regionsResult = results.find((r: any) => r.from_name === "regions");
        const tagsResult = results.find((r: any) => r.from_name === "tags");

        expect(areasResult).to.exist;
        expect(regionsResult).to.exist;
        expect(tagsResult).to.exist;

        expect(areasResult.value.polygonlabels).to.include("Area1");
        expect(regionsResult.value.polygonlabels).to.include("Region1");
        expect(tagsResult.value.labels).to.include("Tagged");
      });
    });
  });

  describe("Text Object Tag", () => {
    it("should create separate results for each label block", () => {
      cy.log("Initialize LSF with Text and multiple Labels blocks");
      LabelStudio.params()
        .config(richTextLabelsConfig)
        .data(testTextData)
        .withResult([])
        .withParam("settings", { continuousLabeling: false })
        .init();

      LabelStudio.waitForObjectsReady();
      Sidebar.hasNoRegions();

      cy.log("Select labels from different blocks");
      Labels.select("Animal"); // From entities block
      Labels.select("Fast"); // From sentiments block

      cy.log("Select text to create region");
      RichText.selectText("quick brown fox");

      cy.log("Verify region was created");
      Sidebar.hasRegions(1);

      cy.log("Verify separate results for each label block");
      LabelStudio.serialize().then((results) => {
        expect(results).to.have.length(2);

        const entitiesResult = results.find((r: any) => r.from_name === "entities");
        const sentimentsResult = results.find((r: any) => r.from_name === "sentiments");

        expect(entitiesResult).to.exist;
        expect(sentimentsResult).to.exist;

        expect(entitiesResult.value.labels).to.include("Animal");
        expect(sentimentsResult.value.labels).to.include("Fast");

        // Both should reference the same text span
        expect(entitiesResult.value.text).to.equal("quick brown fox");
        expect(sentimentsResult.value.text).to.equal("quick brown fox");
        expect(entitiesResult.value.start).to.equal(sentimentsResult.value.start);
        expect(entitiesResult.value.end).to.equal(sentimentsResult.value.end);
      });
    });
  });

  describe("HyperText Object Tag", () => {
    it("should create separate results for each label block", () => {
      cy.log("Initialize LSF with HyperText and multiple HyperTextLabels blocks");
      LabelStudio.params()
        .config(hyperTextLabelsConfig)
        .data(testHyperTextData)
        .withResult([])
        .withParam("settings", { continuousLabeling: false })
        .init();

      LabelStudio.waitForObjectsReady();
      Sidebar.hasNoRegions();

      cy.log("Select labels from different blocks");
      Labels.select("Header"); // From elements block
      Labels.select("Important"); // From semantic block

      cy.log("Select text in hypertext to create region");
      RichText.selectText("Sample Article");

      cy.log("Verify region was created");
      Sidebar.hasRegions(1);

      cy.log("Verify separate results for each label block");
      LabelStudio.serialize().then((results) => {
        expect(results).to.have.length(2);

        const elementsResult = results.find((r: any) => r.from_name === "elements");
        const semanticResult = results.find((r: any) => r.from_name === "semantic");

        expect(elementsResult).to.exist;
        expect(semanticResult).to.exist;

        expect(elementsResult.value.hypertextlabels).to.include("Header");
        expect(semanticResult.value.hypertextlabels).to.include("Important");
      });
    });
  });

  describe("Paragraphs Object Tag", () => {
    it("should create separate results for each label block", () => {
      cy.log("Initialize LSF with Paragraphs and multiple ParagraphLabels blocks");
      LabelStudio.params()
        .config(paragraphsLabelsConfig)
        .data(testParagraphsData)
        .withResult([])
        .withParam("settings", { continuousLabeling: false })
        .init();

      LabelStudio.waitForObjectsReady();
      Sidebar.hasNoRegions();

      cy.log("Select labels from different blocks");
      Labels.select("Introduction"); // From topics block
      Labels.select("High"); // From importance block

      cy.log("Select text from paragraph to create region");
      Paragraphs.selectText("Lorem ipsum dolor sit amet");

      cy.log("Verify region was created");
      Sidebar.hasRegions(1);

      cy.log("Verify separate results for each label block");
      LabelStudio.serialize().then((results) => {
        expect(results).to.have.length(2);

        const topicsResult = results.find((r: any) => r.from_name === "topics");
        const importanceResult = results.find((r: any) => r.from_name === "importance");

        expect(topicsResult).to.exist;
        expect(importanceResult).to.exist;

        expect(topicsResult.value.paragraphlabels).to.include("Introduction");
        expect(importanceResult.value.paragraphlabels).to.include("High");

        // Both results should reference the same paragraph
        expect(topicsResult.value.start).to.equal(importanceResult.value.start);
        expect(topicsResult.value.end).to.equal(importanceResult.value.end);
      });
    });
  });

  describe("Audio Object Tag", () => {
    it("should create separate results for each label block", () => {
      cy.log("Initialize LSF with Audio and multiple Labels blocks");
      LabelStudio.params()
        .config(audioLabelsConfig)
        .data(testAudioData)
        .withResult([])
        .withParam("settings", { continuousLabeling: false })
        .init();

      LabelStudio.waitForObjectsReady();
      AudioView.isReady();
      Sidebar.hasNoRegions();

      cy.log("Select audio labels from different blocks");
      Labels.select("Speaker1"); // From speakers block
      Labels.select("Happy"); // From emotions block

      cy.log("Create audio region by drawing on waveform");
      AudioView.drawRectRelative(0.1, 0.2, 0.2, 0.3);

      cy.log("Verify region was created");
      Sidebar.hasRegions(1);

      cy.log("Verify separate results for each label block");
      LabelStudio.serialize().then((results) => {
        expect(results).to.have.length(2);

        const speakersResult = results.find((r: any) => r.from_name === "speakers");
        const emotionsResult = results.find((r: any) => r.from_name === "emotions");

        expect(speakersResult).to.exist;
        expect(emotionsResult).to.exist;

        expect(speakersResult.value.labels).to.include("Speaker1");
        expect(emotionsResult.value.labels).to.include("Happy");

        // Both should reference the same audio region
        expect(speakersResult.value.start).to.approximately(emotionsResult.value.start, 0.1);
        expect(speakersResult.value.end).to.approximately(emotionsResult.value.end, 0.1);
      });
    });
  });

  describe("TimeSeries Object Tag", () => {
    it("should create separate results for each label block", () => {
      cy.log("Initialize LSF with TimeSeries and multiple TimeSeriesLabels blocks");
      LabelStudio.params()
        .config(timeseriesLabelsConfig)
        .data(testTimeseriesData)
        .withResult([])
        .withParam("settings", { continuousLabeling: false })
        .init();

      LabelStudio.waitForObjectsReady();
      TimeSeries.waitForReady();
      Sidebar.hasNoRegions();

      cy.log("Select timeseries labels from different blocks");
      Labels.select("Peak"); // From events block
      Labels.select("Trend"); // From patterns block

      cy.log("Create timeseries region");
      TimeSeries.drawRegionRelative(0.1, 0.3);

      cy.log("Verify region was created");
      Sidebar.hasRegions(1);

      cy.log("Verify separate results for each label block");
      LabelStudio.serialize().then((results) => {
        expect(results).to.have.length(2);

        const eventsResult = results.find((r: any) => r.from_name === "events");
        const patternsResult = results.find((r: any) => r.from_name === "patterns");

        expect(eventsResult).to.exist;
        expect(patternsResult).to.exist;

        expect(eventsResult.value.timeserieslabels).to.include("Peak");
        expect(patternsResult.value.timeserieslabels).to.include("Trend");

        // Both should reference the same time range
        expect(eventsResult.value.start).to.approximately(patternsResult.value.start, 0.1);
        expect(eventsResult.value.end).to.approximately(patternsResult.value.end, 0.1);
      });
    });
  });

  describe("Video Object Tag", () => {
    // @Todo: This test do not work because in `VideoRectangleResult` we have `mergeLabelsAndResults: true` and it just removes all labels. It should be investigated.
    it.skip("should create separate results for each label block", () => {
      cy.log("Initialize LSF with Video and multiple Labels blocks");
      LabelStudio.params()
        .config(videoLabelsConfig)
        .data(testVideoData)
        .withResult([])
        .withParam("settings", { continuousLabeling: false })
        .init();

      LabelStudio.waitForObjectsReady();
      Sidebar.hasNoRegions();

      cy.log("Select video labels from different blocks");
      Labels.select("Person"); // From objects block
      Labels.select("Walking"); // From actions block

      cy.log("Create video region by drawing rectangle using VideoView helper");
      VideoView.drawRectRelative(0.3, 0.3, 0.4, 0.4);

      cy.log("Verify region was created");
      Sidebar.hasRegions(1);

      cy.log("Verify separate results for each label block");
      LabelStudio.serialize().then((results) => {
        expect(results).to.have.length(2);

        const objectsResult = results.find((r: any) => r.from_name === "objects");
        const actionsResult = results.find((r: any) => r.from_name === "actions");

        expect(objectsResult).to.exist;
        expect(actionsResult).to.exist;

        expect(objectsResult.value.labels).to.include("Person");
        expect(actionsResult.value.labels).to.include("Walking");

        // Both should reference the same video region
        expect(objectsResult.value.x).to.approximately(actionsResult.value.x, 1);
        expect(objectsResult.value.y).to.approximately(actionsResult.value.y, 1);
      });
    });

    it("should create separate results for each timeline label block", () => {
      cy.log("Initialize LSF with Video and multiple TimelineLabels blocks");
      LabelStudio.params()
        .config(videoTimelineLabelsConfig)
        .data(testVideoData)
        .withResult([])
        .withParam("settings", { continuousLabeling: false })
        .init();

      LabelStudio.waitForObjectsReady();
      VideoView.root.should("be.visible");
      Sidebar.hasNoRegions();

      cy.log("Select timeline labels from different blocks");
      Labels.select("Start"); // From events block
      Labels.select("Movement"); // From activities block

      cy.log("Wait for video timeline to be ready");
      VideoView.timelineContainer.should("be.visible");

      cy.log("Create timeline region by clicking on timeline");
      VideoView.clickAtFrame(10);

      cy.log("Verify region was created");
      Sidebar.hasRegions(1);

      cy.log("Verify separate results for each timeline label block");
      LabelStudio.serialize().then((results) => {
        expect(results).to.have.length(2);

        const eventsResult = results.find((r: any) => r.from_name === "events");
        const activitiesResult = results.find((r: any) => r.from_name === "activities");

        expect(eventsResult).to.exist;
        expect(activitiesResult).to.exist;

        expect(eventsResult.value.timelinelabels).to.include("Start");
        expect(activitiesResult.value.timelinelabels).to.include("Movement");

        // Both should reference the same timeline frame
        expect(eventsResult.value.ranges[0].start).to.equal(activitiesResult.value.ranges[0].start);
        expect(eventsResult.value.ranges[0].end).to.equal(activitiesResult.value.ranges[0].end);
      });
    });
  });
});
