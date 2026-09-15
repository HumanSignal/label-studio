
const email = "cypress@example.com";
const password = "cypress-test-password";

Cypress.on("uncaught:exception", (error) => {
  if (error.message.includes("ResizeObserver loop completed with undelivered notifications")) return false;
});

const expectMainMenuLabel = (label: string) => {
  cy.get(".main-menu-trigger").click();
  cy.contains("a", label).should("be.visible");
  cy.get(".main-menu-trigger").click();
};

describe("frontend language preference", () => {
  it("switches to Simplified Chinese and keeps the choice after reload", () => {
    cy.visit("/user/login");
    cy.get("#email").type(email);
    cy.get("#password").type(password, { log: false });
    cy.get("#login-form").submit();

    cy.url().should("not.include", "/user/login");
    cy.visit("/user/account/language");
    cy.window().then((win) => win.localStorage.removeItem("label-studio.language"));
    cy.reload();

    cy.get('[data-testid="language-selector"]').click();
    cy.contains('[cmdk-item=""]', "English").click();
    cy.get('[data-testid="language-selector"]').should("have.attr", "data-value", "en");
    expectMainMenuLabel("Home");

    cy.get('[data-testid="language-selector"]').click();
    cy.contains('[cmdk-item=""]', "简体中文").click();

    cy.get('[data-testid="language-selector"]').should("have.attr", "data-value", "zh-CN");
    expectMainMenuLabel("首页");
    cy.window().its("localStorage").invoke("getItem", "label-studio.language").should("equal", "zh-CN");

    cy.reload();

    cy.get('[data-testid="language-selector"]').should("have.attr", "data-value", "zh-CN");
    expectMainMenuLabel("首页");
  });
});
