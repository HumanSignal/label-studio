const assert = require("assert");

Feature('autosave');

Scenario('Autosave choices', async (I) => {
  I.amOnPage("/");
  // I.waitForText("Welcome to"); // Label Studio uses &nbsp; so don't check it
  // I.see("Setup your label config");
  I.click("Tasks");
  I.click(`[data-tooltip="Delete all tasks"]`);
  I.acceptPopup();
  I.click("Setup");
  I.click("Text classification");
  // button Proceed is not clickable by unknown reason, so click on icon inside
  I.click(locate("i").inside(locate(".button").withText("Proceed")));
  // sample text from classification config
  I.waitForText("to trust yourself");

  I.click("Save");
  I.click("Import Tasks");
  I.amOnPage("/import");
  I.click("Add Sample Task");
  // empty table cell in the first row of data table
  I.click(locate("td").after(locate("td").withText("0")));

  await I.executeScript(() => Htx.completionStore.selected.setAutosaveDelay(1000));
  let pk = await I.executeScript(() => Htx.completionStore.selected.pk);
  assert.equal(pk, "");

  I.dontSee("Update");
  I.see("Submit");
  I.click("Positive");

  I.waitForRequest(req =>
    req.url().endsWith('api/tasks/0/completions/') &&
    req.method() === 'POST',
    2
  );
  I.see("draft saved just now");

  pk = await I.executeScript(() => Htx.completionStore.selected.pk);
  assert.equal(pk, "1");

  I.click("Negative");
  I.waitForRequest(req =>
    req.url().includes('api/tasks/0/completions/') &&
    // @todo check for number
    !req.url().endsWith('completions/') &&
    req.method() === 'PATCH',
    2
  );

  pk = await I.executeScript(() => Htx.completionStore.selected.pk);
  assert.equal(pk, "1");

  I.click("Submit");

  // I.waitForRequest(req =>
  //   req.url().includes('api/tasks/0/completions/') &&
  //   !req.url().endsWith('completions/') &&
  //   req.method() === 'PATCH',
  //   2
  // );

  I.see("Update");
  I.dontSee("Submit");
  I.seeCheckboxIsChecked("Negative");

  pk = await I.executeScript(() => Htx.completionStore.selected.pk);
  assert.equal(pk, "1");
});
