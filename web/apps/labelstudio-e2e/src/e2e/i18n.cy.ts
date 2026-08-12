describe("i18n language selection", () => {
  const STORAGE_KEY = "label-studio.lang";

  beforeEach(() => {
    cy.window().then((win) => win.localStorage.removeItem(STORAGE_KEY));
    cy.visit("/");
  });

  it("persists explicit language selection across reload", () => {
    // sanity check default English
    cy.contains("Projects").should("exist");

    // Switch to zh-CN via localStorage (UI selector is intentionally out of scope for the foundation PR)
    cy.window().then((win) => {
      win.localStorage.setItem(STORAGE_KEY, "zh-CN");
    });
    cy.reload();

    cy.contains("项目").should("exist");
    cy.contains("组织").should("exist");

    // Switch back
    cy.window().then((win) => {
      win.localStorage.setItem(STORAGE_KEY, "en");
    });
    cy.reload();

    cy.contains("Projects").should("exist");
  });

  it("falls back to English when an unsupported language is stored", () => {
    cy.window().then((win) => {
      win.localStorage.setItem(STORAGE_KEY, "klingon");
    });
    cy.reload();

    cy.contains("Projects").should("exist");
    cy.contains("项目").should("not.exist");
  });
});
