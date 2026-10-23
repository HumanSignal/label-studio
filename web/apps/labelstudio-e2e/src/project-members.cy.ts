const PASSWORD = "Passw0rd!-member-access";
const DENIED = "项目不可访问，可能已被删除或访问权限已取消";
const REVOKE_CONFIRM = "取消授权后，该用户不能再访问此项目。已提交的标注会保留。";

const stamp = Date.now();
const ownerEmail = `owner-${stamp}@example.com`;
const memberEmail = `member-a-${stamp}@example.com`;
const projectTitle = `Member access ${stamp}`;

const LABEL_CONFIG = `<View>
  <Text name="text" value="$text"/>
  <Choices name="sentiment" toName="text" choice="single" showInline="true">
    <Choice value="Positive"/>
    <Choice value="Negative"/>
  </Choices>
</View>`;

/** POST a Django form with the csrftoken cookie, following the redirect. */
const submitForm = (path: string, body: Record<string, string>) => {
  cy.request(path);
  cy.getCookie("csrftoken").then((csrf) => {
    cy.request({
      method: "POST",
      url: path,
      form: true,
      body: { ...body, csrfmiddlewaretoken: csrf?.value ?? "" },
    });
  });
};

describe("Project member access", () => {
  // Ids are known only once the earlier commands ran, so later steps read them lazily.
  const state = { projectId: 0, memberUserId: 0, memberSessionId: "" };
  const memberRow = () => cy.then(() => cy.get(`[data-testid="project-member-${state.memberUserId}"]`));

  it("lets the organization owner grant a member who can annotate until revoked", () => {
    // Owner: the first signup creates the organization and makes the user its owner.
    cy.clearCookies();
    submitForm("/user/signup/", { email: ownerEmail, password: PASSWORD, title: "Member access org" });
    cy.getCookie("sessionid").should("exist");

    // Owner: a project with one task, created through the real API.
    cy.request("POST", "/api/projects", { title: projectTitle, label_config: LABEL_CONFIG })
      .its("body.id")
      .then((id: number) => {
        state.projectId = id;
        cy.request("POST", `/api/projects/${id}/import`, [{ text: "Member access task" }]);
      });

    // User A joins the owner's organization through the existing invite link.
    cy.request("/api/invite")
      .its("body.invite_url")
      .then((inviteUrl: string) => {
        cy.clearCookies();
        submitForm(inviteUrl, { email: memberEmail, password: PASSWORD });
      });
    cy.getCookie("sessionid").should("exist");
    cy.request("/api/current-user/whoami")
      .its("body.id")
      .then((id: number) => {
        state.memberUserId = id;
      });

    // Owner grants A on the project members page.
    cy.login(ownerEmail, PASSWORD);
    cy.then(() => cy.visit(`/projects/${state.projectId}/settings/members`));
    cy.contains("h1", "项目成员").should("be.visible");
    cy.contains("button", memberEmail).click();
    cy.contains("button", "添加成员").click();
    memberRow().should("contain.text", memberEmail);
    // The revoke confirmation names the consequences; declining keeps the grant.
    memberRow().contains("button", "取消授权").click();
    cy.contains(REVOKE_CONFIRM).should("be.visible");
    cy.contains("button", "返回").click();
    memberRow().should("contain.text", memberEmail);

    // A sees only this project, annotates, and has no import or member management.
    cy.login(memberEmail, PASSWORD);
    cy.visit("/projects/");
    cy.contains(projectTitle).should("be.visible");
    cy.then(() => cy.visit(`/projects/${state.projectId}/data`));
    cy.contains("Member access task").click();
    cy.contains("Positive").click();
    cy.intercept("POST", "/api/tasks/*/annotations*").as("submitAnnotation");
    cy.contains("button", "Submit").click();
    cy.wait("@submitAnnotation").its("response.statusCode").should("eq", 201);
    cy.contains("button", "Update").should("be.visible");
    cy.contains("button", "Import").should("not.exist");
    cy.contains("项目成员").should("not.exist");
    cy.contains("button", "添加成员").should("not.exist");

    // A keeps the loaded labeling page. The owner revokes A through the member API
    // with the owner's session, then A's own session is restored in the same browser.
    cy.getCookie("sessionid").then((cookie) => {
      state.memberSessionId = cookie!.value;
    });
    cy.login(ownerEmail, PASSWORD);
    cy.then(() => cy.request("DELETE", `/api/projects/${state.projectId}/members/${state.memberUserId}/`))
      .its("status")
      .should("be.oneOf", [200, 204]);
    cy.then(() => cy.setCookie("sessionid", state.memberSessionId));

    // A changes the answer and saves again from the original page: denied, no success.
    cy.intercept("PATCH", "/api/annotations/*").as("updateAnnotation");
    cy.contains("Negative").click();
    cy.contains("button", "Update").click();
    // The backend refused the save.
    cy.wait("@updateAnnotation").its("response.statusCode").should("be.oneOf", [403, 404]);
    cy.contains(DENIED).should("be.visible");
    // Updating an existing annotation shows "updated"; "saved" is the create message. Neither may appear.
    cy.contains("Annotation updated successfully").should("not.exist");
    cy.contains("Annotation saved successfully").should("not.exist");
  });
});
