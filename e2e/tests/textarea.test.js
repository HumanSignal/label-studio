Feature("textarea");

Scenario("Use classification config with textarea", async (I) => {
  I.amOnPage("/");
  // const text = await I.grabTextFrom(".title");
  // pause();
  // Label Studio uses &nbsp; so check only for the first part
  // try {
  // if (text && text.includes("Welcome to")) {
    // I.waitForText("Welcome to");
    // I.see("Setup your label config");
  // } else {
  // } catch(e) {
    I.click("Tasks");
    I.click(`[data-tooltip="Delete all tasks"]`);
    I.acceptPopup();
  // }

  I.click("Setup");
  I.click("Text summarization");
  // button Proceed is not clickable by unknown reason, so click on icon inside
  I.click(locate("i").inside(locate(".button").withText("Proceed")));
  // request after validating config and importing example
  // so hope there will be always anough time
  // don't try to get through these step in interactive mode!
  I.waitForResponse(req => req.url().includes("/render-label-studio"));
  // sample text from classification config
  I.waitForText("to trust yourself");
  // header from that config
  I.waitForText("Provide one sentence summary");

  // @todo this doesn't work in headless mode for unknown reason
  // editor rendered inside an iframe
  // I.switchTo("iframe");
  // I.fillField("[name=answer]", "test");
  // I.pressKey("Enter");
  // I.switchTo();

  I.click("input[value=Save]");
  I.waitForText("Import Tasks", 6);
  I.click("Import Tasks");
  I.amOnPage("/import");
  I.click("Add Sample Task");
  // empty table cell in the first row of data table
  I.click(locate("td").after(locate("td").withText("0")));

  I.fillField("[name=answer]", "test");
  I.pressKey('Enter');
  // because of `maxSubmissions=1`
  I.dontSeeElement('[name=answer]');
  I.click('Submit');
});
