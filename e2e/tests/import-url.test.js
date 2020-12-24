const assert = require("assert")

Feature("Import by URL")

Scenario("Import single image by URL", async (I) => {
  I.wait(7);
  I.amOnPage('/')
  I.see("Welcome to")
  I.seeNumberOfElements(locate("a").withText("Import"), 2)
  // top menu item is hidden during onboarding
  I.seeNumberOfVisibleElements(locate("a").withText("Import"), 1)
  I.click(locate("a.button").withText("Import"))
  I.waitInUrl("/import")
  I.click("URL")
  I.fillField("Dataset URL", "https://app.heartex.ai/static/samples/sample.jpg")
  I.click("Load")
  I.see("1 tasks loaded")
  I.click(locate("button").withText("Import"))
  // table with imported items — should be only one already
  I.seeNumberOfElements("img[alt=Data]", 1)
  I.click("img[alt=Data]")
  I.see("Labeling is not configured")
  I.click("Go to setup")
  I.click("Bbox object detection")
  I.waitForVisible(locate("div.button").withText("Proceed"))
  I.click(locate("div.button").withText("Proceed"))
  // config is validated on backend
  I.wait(2)
  I.click("Save")
  I.click("Explore Tasks")
  // open the task
  I.click("img[alt=Data]")
  I.see("Airplane")
  I.see("Regions (0)")
  I.click("Skip")
  // skipped icon in completions list
  I.seeElement("[aria-label=forward]")
  // completion date are filled in
  const completed = await I.grabTextFrom('.table-row > div:nth-child(3)')
  assert.notEqual(completed, "")
  I.click("Back")
  // both completions and skipped counts are equal to 1
  I.seeTextEquals("1", ".table-row > div:nth-child(4)")
  I.seeTextEquals("1", ".table-row > div:nth-child(5)")
  // select task
  I.click(".select-row input[type=checkbox]")
  I.click("Delete tasks")
  I.click("OK")
  // empty state
  I.see("Looks like you have not imported any data yet")
  I.see("0 / 0")
  // Back to origins
  I.click("Go to import")
})
