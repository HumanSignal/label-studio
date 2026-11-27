import { beforeEach, describe, expect, it } from "bun:test";
import { DEFAULT_HOTKEYS, HOTKEY_SECTIONS } from "./defaults";
import {
  clearDynamicHotkeySections,
  getDynamicHotkeys,
  getDynamicSections,
  getHotkeySections,
  getTypedDefaultHotkeys,
} from "./utils";
import { extractBespokeHotkeys, syncProjectInterfaceHotkeys } from "./interfaceComponentsRegistry";

describe("Dynamic Project Hotkey Governance", () => {
  beforeEach(() => {
    clearDynamicHotkeySections();
  });

  it("ensures defaults.js contains zero static AudioCanvas entries", () => {
    const audioCanvasHotkeys = (DEFAULT_HOTKEYS as Array<{ section: string }>).filter(
      (h) => h.section === "AudioCanvas",
    );
    expect(audioCanvasHotkeys.length).toBe(0);

    const audioCanvasSection = (HOTKEY_SECTIONS as Array<{ id: string }>).find((s) => s.id === "AudioCanvas");
    expect(audioCanvasSection).toBeUndefined();
  });

  it("returns only core static sections and defaults when includeDynamic is false", () => {
    const staticSections = getHotkeySections({ includeDynamic: false });
    expect(staticSections.some((s) => s.id === "AudioCanvas")).toBe(false);

    const staticDefaults = getTypedDefaultHotkeys({ includeDynamic: false });
    expect(staticDefaults.some((h) => h.section === "AudioCanvas")).toBe(false);
  });

  it("does not register dynamic sections for non-custom projects or null projects", () => {
    syncProjectInterfaceHotkeys(null);
    expect(getDynamicSections().length).toBe(0);
    expect(getDynamicHotkeys().length).toBe(0);

    syncProjectInterfaceHotkeys({
      id: 1,
      use_custom_interface: false,
      custom_interface_code: "<AudioCanvas />",
    });
    expect(getDynamicSections().length).toBe(0);
    expect(getDynamicHotkeys().length).toBe(0);
  });

  it("dynamically registers AudioCanvas only for custom projects referencing AudioCanvas", () => {
    syncProjectInterfaceHotkeys({
      id: 42,
      use_custom_interface: true,
      custom_interface_code: `
        import React from "react";
        const AudioCanvas = window.InterfaceComponents.AudioCanvas;
        export default function Screen(props) {
          return <AudioCanvas src={props.task.data.audio} hotkeys={props.hotkeys} />;
        }
      `,
    });

    const dynamicSections = getDynamicSections();
    expect(dynamicSections.length).toBe(1);
    expect(dynamicSections[0].id).toBe("AudioCanvas");
    expect(dynamicSections[0].title).toBe("Audio Canvas");

    const dynamicHotkeys = getDynamicHotkeys();
    expect(dynamicHotkeys.length).toBe(7);
    const elements = dynamicHotkeys.map((h) => h.element);
    expect(elements).toContain("playPause");
    expect(elements).toContain("zoomIn");
    expect(elements).toContain("zoomOut");
    expect(elements).toContain("deleteRegion");
    expect(elements).toContain("skipStart");
    expect(elements).toContain("stepBack");
    expect(elements).toContain("stepForward");

    // Static lookup stays clean
    expect(getHotkeySections({ includeDynamic: false }).some((s) => s.id === "AudioCanvas")).toBe(false);
    expect(getTypedDefaultHotkeys({ includeDynamic: false }).some((h) => h.section === "AudioCanvas")).toBe(false);

    // Dynamic lookup includes it
    expect(getHotkeySections({ includeDynamic: true }).some((s) => s.id === "AudioCanvas")).toBe(true);
    expect(getTypedDefaultHotkeys({ includeDynamic: true }).some((h) => h.section === "AudioCanvas")).toBe(true);
  });

  it("dynamically extracts bespoke agent-built hotkeys from custom_interface_params", () => {
    syncProjectInterfaceHotkeys({
      id: 101,
      use_custom_interface: true,
      custom_interface_params: {
        hotkeys: {
          name: "DocTagger",
          title: "Document Tagger",
          description: "Shortcuts for tagging text documents",
          actions: {
            approve: {
              label: "Approve Document",
              defaultHotkey: "1",
              description: "Approve document",
            },
            reject: {
              label: "Reject Document",
              defaultHotkey: "2",
              description: "Reject document",
            },
          },
        },
      },
    });

    const dynamicSections = getDynamicSections();
    expect(dynamicSections.length).toBe(1);
    expect(dynamicSections[0].id).toBe("DocTagger");
    expect(dynamicSections[0].title).toBe("Document Tagger");

    const dynamicHotkeys = getDynamicHotkeys();
    expect(dynamicHotkeys.length).toBe(2);
    expect(dynamicHotkeys.find((h) => h.element === "approve")?.key).toBe("1");
    expect(dynamicHotkeys.find((h) => h.element === "reject")?.key).toBe("2");
  });

  it("dynamically extracts bespoke agent-built hotkeys from custom_interface_code exports", () => {
    const code = `
      function Screen(props) {
        return <div>Custom Agent Screen</div>;
      }
      export default {
        default: Screen,
        hotkeys: {
          name: "SentimentReview",
          title: "Sentiment Review",
          description: "Shortcuts for sentiment labeling",
          actions: {
            positive: {
              label: "Positive Sentiment",
              defaultHotkey: "p",
              description: "Mark positive",
            },
            negative: {
              label: "Negative Sentiment",
              defaultHotkey: "n",
              description: "Mark negative",
            },
          },
        },
      };
    `;

    const extracted = extractBespokeHotkeys(null, code);
    expect(extracted.length).toBe(1);
    expect(extracted[0].name).toBe("SentimentReview");
    expect(extracted[0].title).toBe("Sentiment Review");
    expect(Object.keys(extracted[0].actions)).toEqual(["positive", "negative"]);

    syncProjectInterfaceHotkeys({
      id: 202,
      use_custom_interface: true,
      custom_interface_code: code,
    });

    const dynamicSections = getDynamicSections();
    expect(dynamicSections.some((s) => s.id === "SentimentReview")).toBe(true);
    const dynamicHotkeys = getDynamicHotkeys();
    expect(dynamicHotkeys.some((h) => h.section === "SentimentReview" && h.element === "positive")).toBe(true);
    expect(dynamicHotkeys.some((h) => h.section === "SentimentReview" && h.element === "negative")).toBe(true);
  });

  it("clears dynamic hotkeys immediately when switching to account or another non-custom project", () => {
    // 1. Activate custom project
    syncProjectInterfaceHotkeys({
      id: 42,
      use_custom_interface: true,
      custom_interface_code: "<AudioCanvas />",
    });
    expect(getDynamicSections().length).toBe(1);

    // 2. Switch to account / non-custom project
    syncProjectInterfaceHotkeys(null);
    expect(getDynamicSections().length).toBe(0);
    expect(getDynamicHotkeys().length).toBe(0);
    expect(getHotkeySections({ includeDynamic: true }).some((s) => s.id === "AudioCanvas")).toBe(false);
  });

  it("extracts hotkeys declared via top-level constant and referenced in module exports", () => {
    const code = `
      const MY_SHORTCUTS = {
        name: "TopLevelHotkeys",
        title: "Top Level Shortcuts",
        description: "Defined as top-level constant",
        actions: {
          tagA: { label: "Tag A", defaultHotkey: "a" },
          tagB: { label: "Tag B", defaultHotkey: "b" },
        },
      };

      function Screen(props) {
        return <div>Screen</div>;
      }

      ({
        default: Screen,
        hotkeys: MY_SHORTCUTS,
      })
    `;

    const extracted = extractBespokeHotkeys(null, code);
    expect(extracted.length).toBe(1);
    expect(extracted[0].name).toBe("TopLevelHotkeys");
    expect(extracted[0].title).toBe("Top Level Shortcuts");
    expect(Object.keys(extracted[0].actions)).toEqual(["tagA", "tagB"]);

    syncProjectInterfaceHotkeys({
      id: 303,
      use_custom_interface: true,
      custom_interface_code: code,
    });
    const sections = getDynamicSections();
    expect(sections.some((s) => s.id === "TopLevelHotkeys")).toBe(true);
    const hotkeys = getDynamicHotkeys();
    expect(hotkeys.some((h) => h.section === "TopLevelHotkeys" && h.element === "tagA")).toBe(true);
  });

  it("supports array actions format in bespoke hotkey manifests", () => {
    const code = `
      ({
        default: MyScreen,
        hotkeys: {
          name: "ArrayActions",
          title: "Array Actions",
          actions: [
            { id: "actionOne", label: "Action One", defaultHotkey: "1" },
            { id: "actionTwo", label: "Action Two", defaultHotkey: "2" },
          ],
        },
      })
    `;

    const extracted = extractBespokeHotkeys(null, code);
    expect(extracted.length).toBe(1);
    expect(extracted[0].name).toBe("ArrayActions");
    expect(extracted[0].actions.actionOne.defaultHotkey).toBe("1");
    expect(extracted[0].actions.actionTwo.defaultHotkey).toBe("2");
  });

  it("supports projects that compose both library components (AudioCanvas) and bespoke shortcuts", () => {
    const code = `
      const AudioCanvas = window.InterfaceComponents.AudioCanvas;

      const CUSTOM_HOTKEYS = {
        name: "ReviewShortcuts",
        title: "Review Shortcuts",
        actions: {
          submitReview: { label: "Submit Review", defaultHotkey: "ctrl+enter" },
        },
      };

      function Screen(props) {
        return (
          <div>
            <AudioCanvas src={props.task.data.audio} hotkeys={props.hotkeys} />
          </div>
        );
      }

      ({
        default: Screen,
        hotkeys: CUSTOM_HOTKEYS,
      })
    `;

    syncProjectInterfaceHotkeys({
      id: 505,
      use_custom_interface: true,
      custom_interface_code: code,
    });

    const dynamicSections = getDynamicSections();
    expect(dynamicSections.length).toBe(2);
    expect(dynamicSections.some((s) => s.id === "AudioCanvas")).toBe(true);
    expect(dynamicSections.some((s) => s.id === "ReviewShortcuts")).toBe(true);

    const dynamicHotkeys = getDynamicHotkeys();
    // 7 from AudioCanvas + 1 from ReviewShortcuts
    expect(dynamicHotkeys.length).toBe(8);
    expect(dynamicHotkeys.some((h) => h.section === "AudioCanvas" && h.element === "playPause")).toBe(true);
    expect(dynamicHotkeys.some((h) => h.section === "ReviewShortcuts" && h.element === "submitReview")).toBe(true);
  });
});
