// in this file you can append custom step methods to 'I' object

module.exports = function() {
  return actor({

    // Define custom steps here, use 'this' to access default methods of I.
    // It is recommended to place a general 'login' function here.

    async reset() {
      const I = this;
      I.amOnPage("/settings")
      const config = await I.grabValueFrom("#id_label_config")
      // if config is not empty
      if (config.replace(/\s+/, "") !== "<View></View>") {
        I.say("Reset app state to the empty one")
        I.click("Data storage")
        I.click('[data-tooltip="Delete all tasks"]')
        I.click("Labeling config")
        I.click("Reset")
        // config is validated on backend
        I.wait(2)
        I.click("Save")
      }
    },
  });
}
