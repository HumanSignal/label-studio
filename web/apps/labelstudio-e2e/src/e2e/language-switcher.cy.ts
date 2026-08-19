describe("menubar language switcher", () => {
  const STORAGE_KEY = "label-studio.lang";

  beforeEach(() => {
    // The app's service worker precaches ~9MB of assets on registration and
    // starves the API requests under Cypress. Block it from ever registering.
    cy.intercept("GET", "/sw.js", { statusCode: 404, body: "" }).as("blocked-sw");

    cy.visit("/user/login/");
    cy.clearCookie("django_language");
    cy.window({ log: false }).then((win) => win.localStorage.removeItem(STORAGE_KEY));
  });

  const login = () => {
    // UI form submission hangs the page load in Cypress; log in via request instead
    cy.request("/user/login/").then(({ body }) => {
      const csrf = body.match(/name="csrfmiddlewaretoken" value="([^"]+)"/);
      expect(csrf, "csrf token found").to.not.be.null;
      cy.request({
        method: "POST",
        url: "/user/login/?next=/",
        form: true,
        followRedirect: false,
        body: {
          csrfmiddlewaretoken: csrf[1],
          email: "zcode.i18n.check@example.com",
          password: "ZcodeCheck#2026",
        },
      });
    });
    cy.visit("/");
  };

  const openMenuAndPick = (localeLabel: string) => {
    cy.get("[data-testid=language-switcher]").click();
    cy.contains(localeLabel).click();
  };

  it("switches the UI between Chinese and English", () => {
    login();

    // The initial language follows the browser locale; read it instead of assuming.
    cy.get("[data-testid=language-switcher]", { timeout: 20000 })
      .should("have.attr", "aria-label")
      .and("match", /^(切换语言|Switch language)$/)
      .then((label) => {
        const startsZh = label === "切换语言";
        const zh = {
          label: "切换语言",
          welcome: "欢迎 👋",
          pick: "中文（简体）",
          locale: "zh-CN",
        };
        const en = {
          label: "Switch language",
          welcome: "Welcome 👋",
          pick: "English",
          locale: "en",
        };
        const first = startsZh ? en : zh;
        const second = startsZh ? zh : en;

        // switch to the other language
        openMenuAndPick(first.pick);
        cy.contains(first.welcome, { timeout: 20000 }).should("exist");
        cy.get("[data-testid=language-switcher]").should("have.attr", "aria-label", first.label);
        cy.window().then((win) => expect(win.localStorage.getItem(STORAGE_KEY)).to.eq(first.locale));
        cy.getCookie("django_language").should("have.property", "value", first.locale);

        // and back
        openMenuAndPick(second.pick);
        cy.contains(second.welcome, { timeout: 20000 }).should("exist");
        cy.get("[data-testid=language-switcher]").should("have.attr", "aria-label", second.label);
        cy.window().then((win) => expect(win.localStorage.getItem(STORAGE_KEY)).to.eq(second.locale));
        cy.getCookie("django_language").should("have.property", "value", second.locale);
      });
  });
});
