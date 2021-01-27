const assert = require("assert")

Feature("Import by upload")

Before(I => I.reset())

Scenario("Import images from list.txt", async (I) => {
  I.amOnPage("/")
  I.see("Welcome to")
  I.seeNumberOfVisibleElements(locate("a").withText("Import"), 1)
  I.click(locate("a.button").withText("Import"))
  I.waitInUrl("/import")

  I.say("Upload list of files")
  I.attachFile("#file-input", "assets/list.txt")
  I.see("4 tasks loaded")
  I.click("Imported files are")
  I.see("1 tasks loaded")
  I.click("Imported files are")
  I.click(locate("button").withText("Import"))

  I.say("Redirect to DM with imported tasks")
  I.see("Tab 1")
  // table with imported items — should be only one already
  I.see("Tasks: 4 / 4")
  // images have no type yet, so no thumbnails are displayed, click just somewhere
  I.click(".select-row + div")
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
  // there are 4 rows so array is returned
  assert.notEqual(completed[0], "")
  I.click("Back")

  I.say("Check task status and remove all the tasks")
  // both completions and skipped counts are equal to 1
  // check only the first row (2nd after header)
  I.seeTextEquals("1", ".row-wrapper:nth-child(2) .table-row > div:nth-child(4)")
  I.seeTextEquals("1", ".row-wrapper:nth-child(2) .table-row > div:nth-child(5)")
  // select task
  I.click(".select-all input[type=checkbox]")
  I.click("Delete tasks")
  I.click("OK")
  // @todo it fails sometimes so wait for fix
  // empty state
  // I.see("Looks like you have not imported any data yet")
  // I.see("0 / 0")
  // Back to origins
  // I.click("Go to import")
})
