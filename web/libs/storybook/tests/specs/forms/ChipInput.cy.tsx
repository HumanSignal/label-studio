import { ChipInput } from "../../../src/components/form/ChipInput/ChipInput";
import sinon from "sinon";
import z from "zod";

describe("Basic rendering", () => {
  beforeEach(() => {
    cy.viewport(500, 54);
  });
  it("should correctly work with emails", () => {
    const placeholder = "This is text";
    cy.mount(<ChipInput placeholder={placeholder} />);

    cy.get("[data-testid=placeholder]").should("have.text", placeholder);

    cy.get("[data-testid=chip-input-field]").type("hello@world.com{enter}");

    cy.get("[data-testid=chip]").should("have.length", 1);
  });

  it("should properly handle paste", () => {
    cy.mount(<ChipInput />);

    cy.get("[data-testid=chip-input-field]")
      .paste("one@example.com two@example.com")
      .trigger("blur")
      .should("have.value", "two@example.com");

    cy.get("[data-testid=chip]").should("have.length", 1);
  });

  it("should not allow invalid values", () => {
    cy.mount(<ChipInput />);

    cy.get("[data-testid=chip-input-field]").type("invalid@value{enter}");

    cy.get("[data-testid=chip]", { timeout: 200 }).should("not.exist");
  });

  it("should allow arbitrary strings", () => {
    cy.mount(<ChipInput validate={z.string()} />);

    cy.get("[data-testid=chip-input-field]").type("one two three{enter}");

    cy.get("[data-testid=chip]").should("have.length", 3);
  });

  it("should allow string of specific length", () => {
    cy.mount(<ChipInput validate={z.string().min(3).max(6)} />);
    const input = () => cy.get("[data-testid=chip-input-field]");
    const chip = () => cy.get("[data-testid=chip]");

    input().type("one{enter}");

    chip().should("have.length", 1);

    input().type("he{enter}");

    chip().should("have.length", 1);

    input().should("have.value", "he");
    input().type("lp{enter}");

    chip().should("have.length", 2);
    input().type("implementation{enter}");
    chip().should("have.length", 2);
  });

  it("should correctly display placeholder", () => {
    const placeholder = "Comma-separated list of tags";
    cy.mount(<ChipInput placeholder={placeholder} />);

    cy.get("[data-testid=placeholder]").should("have.text", placeholder);

    cy.get("[data-testid=chip-input-field]").type("email@example.com{enter}");

    cy.get("[data-testid=placeholder]").should("not.exist");

    cy.get("[data-testid=chip]").get("[data-testid=chip-remove]").click();

    cy.get("[data-testid=placeholder]").should("have.text", placeholder);

    cy.get("[data-testid=chip-input-field]").focus().blur();
    cy.get("[data-testid=placeholder]").should("be.visible");
  });

  it('should support separators: "enter", ",", " "', () => {
    cy.mount(<ChipInput />);

    const input = () => cy.get("[data-testid=chip-input-field]");
    const chip = () => cy.get("[data-testid=chip]");

    input().type("one@example.com{enter}");
    chip().should("have.length", 1);

    input().type("two@example.com ");
    chip().should("have.length", 2);

    input().type("three@example.com,");
    chip().should("have.length", 3);
  });

  it("should only allow unique values", () => {
    const defaultValues = [
      "one@example.com",
      "two@example.com",
      "three@example.com",
      "three@example.com", // <-- duplicate
    ];
    cy.mount(<ChipInput value={defaultValues} />);

    const input = () => cy.get("[data-testid=chip-input-field]");
    const chip = () => cy.get("[data-testid=chip]");

    chip().should("have.length", 3);

    input().type("three@example.com{enter}");

    chip().should("have.length", 3);
  });

  it("should properly emit `onChange` event", () => {
    const handler = cy.stub().as("handler");
    cy.mount(<ChipInput onChange={handler} />);

    const input = () => cy.get("[data-testid=chip-input-field]");

    input().type("one@example.com{enter}");

    cy.get("@handler").should("have.been.calledWithMatch", sinon.match(["one@example.com"]));
  });
});
