Feature('choices');

Scenario('Setup choices config from start', (I) => {
  I.wait(7);
  I.amOnPage("/");
  I.waitForText("Welcome to"); // Label Studio uses &nbsp; so don't check it
  I.see("Setup your label config");
  I.click("Setup");
  I.click("Text classification");
  // @todo surprisingly Proceed doesn't work despite it is discoverable
  // @todo so instead we click inside page and click again
  // I.click("Proceed");
  I.wait(1);
  I.click("Text classification");
  I.wait(1);
  I.click("Text classification");
  // sample text from classification config
  I.waitForText("to trust yourself");

  I.click("Save");
  I.click("Import Tasks");
  I.waitInUrl("/import", 6);
  I.click("Add Sample Task");
  // empty table cell in the first row of data table
  I.click(locate("td").after(locate("td").withText("0")));

  I.dontSee("Update");
  I.see("Submit");
  I.click("Positive");
  I.click("Submit");
  I.see("Update");
  I.dontSee("Submit");
  I.seeCheckboxIsChecked("Positive");
});
