import { Hotkeys, LabelStudio, Textarea } from "@humansignal/frontend-test/helpers/LSF";
import {
  shortcutTextareaConfig,
  shortcutTextareaData,
  simpleChoicesConfig,
  simpleChoicesData,
} from "../../data/control_tags/shortcuts";

describe("Control Tags - Shortcuts", () => {
  it("applies shortcuts while preserving cursor edits in inline input", () => {
    LabelStudio.params().config(shortcutTextareaConfig(1)).data(shortcutTextareaData).withResult([]).init();
    LabelStudio.waitForObjectsReady();

    Textarea.input.click().type("A B");
    Textarea.input.type("3");
    Textarea.input.type("{leftArrow}{leftArrow}");
    Textarea.input.type("{shift}{leftArrow}");
    cy.contains(".ant-tag", "[ + ]").click();
    Textarea.input.type("{leftArrow}{leftArrow}{leftArrow}{leftArrow}");
    Textarea.input.type("1");
    Textarea.input.type("{shift+enter}");

    LabelStudio.serialize().then((result) => {
      expect(result).to.have.length(1);
      expect(result[0].value.text[0]).to.match(/^-A \+\s+B!$/);
    });
  });

  it("applies shortcuts for emoji replacement", () => {
    LabelStudio.params().config(shortcutTextareaConfig(3)).data(shortcutTextareaData).withResult([]).init();
    LabelStudio.waitForObjectsReady();

    Textarea.input.click().type("🐱🐱🐱");
    Textarea.input.type("{leftArrow}");
    Textarea.input.type("4");
    Textarea.input.type("{shift+enter}");

    LabelStudio.serialize().then((result) => {
      expect(result).to.have.length(1);
      expect(result[0].value.text[0]).to.contain("‍👤");
      expect(result[0].value.text[0]).to.contain("🐱");
    });
  });

  it("supports numpad hotkeys for choices", () => {
    LabelStudio.params().config(simpleChoicesConfig).data(simpleChoicesData).withResult([]).init();
    LabelStudio.waitForObjectsReady();

    cy.contains("Click me").should("be.visible");
    cy.get("body").focus().trigger("keydown", {
      key: "5",
      code: "Numpad5",
      keyCode: 101,
      which: 101,
      location: 3,
      bubbles: true,
      composed: true,
      force: true,
    });

    LabelStudio.serialize().then((result) => {
      expect(result).to.have.length(1);
      expect(result[0].value.choices).to.deep.equal(["Click me"]);
    });
  });

  it("supports generic editor hotkeys from helper utilities", () => {
    LabelStudio.params().config(simpleChoicesConfig).data(simpleChoicesData).withResult([]).init();
    LabelStudio.waitForObjectsReady();

    cy.contains("Click me").click();
    Hotkeys.unselectAllRegions();
    cy.get(".lsf-highlight").should("have.length", 0);
  });
});
