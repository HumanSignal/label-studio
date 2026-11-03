declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Log in through POST /user/login/ and keep Django's `sessionid` cookie
       * in the browser. Any earlier session is dropped first.
       */
      login(email: string, password: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add("login", (email: string, password: string) => {
  // Do not navigate: the caller may keep a loaded page open and switch accounts under it.
  cy.clearCookies();
  cy.getCookie("sessionid").should("not.exist");
  // The login form is CSRF protected: the GET sets the csrftoken cookie.
  cy.request({ url: "/user/login/", followRedirect: false }).then((res) => {
    expect(res.status, "GET /user/login/ renders the form for a signed-out browser").to.eq(200);
  });
  cy.getCookie("csrftoken").then((csrf) => {
    expect(csrf, "csrftoken cookie").to.exist;
    cy.request({
      method: "POST",
      url: "/user/login/",
      form: true,
      body: { email, password, csrfmiddlewaretoken: csrf?.value },
    });
  });
  cy.getCookie("sessionid").should("exist");
});

export {};
