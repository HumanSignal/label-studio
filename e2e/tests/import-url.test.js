const assert = require("assert")

Feature("Import by URL")

Before(I => I.reset())

Scenario("Import single image by URL", async (I) => {
  I.amOnPage("/")
  I.see("Welcome to")
  I.seeNumberOfVisibleElements(locate("a").withText("Import"), 1)
  I.click(locate("a.button").withText("Import"))
  I.waitInUrl("/import")

  I.say("Import file by url")
  I.click("URL")
  I.fillField("Dataset URL", "https://app.heartex.ai/static/samples/sample.jpg")
  I.click("Load")

  I.say("Redirect to DM with imported tasks")
  I.see("1 tasks loaded")
  I.click(locate("button").withText("Import"))
  // table with imported items — should be only one already
  I.seeNumberOfElements("img[alt=Data]", 1)
  I.click("img[alt=Data]")
  I.see("You're almost there!")
  I.click("Go to setup")

  I.say("Config setup")
  I.click("Bbox object detection")
  I.waitForVisible(locate("div.button").withText("Proceed"))
  I.click(locate("div.button").withText("Proceed"))
  // config is validated on backend
  I.wait(2)
  I.click("Save")
  I.click("Explore Tasks")

  I.say("Work with task in DM")
  // open the task
  I.click("img[alt=Data]")
  I.see("Airplane")
  I.see("Regions (0)")
  I.click("Skip")
  // skipped icon in completions list
  I.seeElement("[aria-label=stop]")
  // completion date are filled in
  const completed = await I.grabTextFrom(".table-row > div:nth-child(3)")
  assert.notEqual(completed, "")
  I.click("Back")

  I.say("Check task status and remove all the tasks")
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
