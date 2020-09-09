Feature("textareas");

Scenario("Smoke test", async (I) => {
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
  // sample text from classification config
  I.waitForText("to trust yourself");

  // editor rendered inside an iframe
  I.switchTo("iframe");
  I.fillField("[name=answer]", "test");
  I.pressKey("Enter");
  I.switchTo();

  I.click("Save");
  I.click("Import Tasks");
  I.click("Add Sample Task");
  // empty table cell in the first row of data table
  I.click(locate("td").after(locate("td").withText("0")));

  I.fillField("[name=answer]", "test");
  I.pressKey('Enter');
  // because of `maxSubmissions=1`
  I.dontSeeElement('[name=answer]');
  I.click('Submit');
});
