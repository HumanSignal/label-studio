describe("create project labeling setup page", () => {
  // opening the wizard always creates a draft project — clean it up after
  let draftProjectId: number | undefined;

  beforeEach(() => {
    cy.intercept("GET", "/sw.js", { statusCode: 404, body: "" }).as("blocked-sw");
    cy.intercept("POST", "/api/projects", (req) => {
      req.continue((res) => {
        draftProjectId = res.body?.id;
      });
    }).as("create-draft");
    cy.visit("/user/login/");
    cy.request("/user/login/").then(({ body }) => {
      const csrf = body.match(/name="csrfmiddlewaretoken" value="([^"]+)"/);
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
    cy.visit("/projects");
    cy.window({ log: false }).then((win) => win.localStorage.setItem("label-studio.lang", "zh-CN"));
    cy.reload();
  });

  afterEach(() => {
    if (draftProjectId) {
      cy.request({ method: "DELETE", url: `/api/projects/${draftProjectId}/`, failOnStatusCode: false });
    }
  });

  it("shows the template gallery in Chinese", () => {
    cy.get('button[aria-label="创建新项目"]', { timeout: 20000 }).click();
    // go to the 3rd wizard tab (标注设置)
    cy.contains("标注设置").click();
    cy.contains("计算机视觉", { timeout: 15000 }).should("exist");
    cy.contains("自定义模板").should("exist");
    cy.contains("查看文档了解如何").should("exist");

    // template cards translate
    cy.contains("图像分类", { timeout: 15000 }).should("exist");

    // open a template to reach the config editor
    cy.contains("图像分类").closest("li").click();
    cy.contains("标注界面", { timeout: 15000 }).should("exist");
    cy.contains("浏览模板").should("exist");
  });
});
