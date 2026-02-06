const { dragKonva, serialize } = require("../helpers");
const assert = require("assert");

const config = `
  <View>
    <Image name="image" value="$image" zoomcontrol="true"/>
    <RectangleLabels name="label" toName="image">
        <Label value="Airplane" background="green"/>
        <Label value="Car" background="blue"/>
    </RectangleLabels>
    <RectangleLabels name="label2" toName="image">
        <Label value="F1"/>
        <Label value="Plane"/>
    </RectangleLabels>
  </View>
`;

const data = {
  image: "/public/files/images/nick-owuor-unsplash.jpg",
};

Feature("Two or more same named tools referred same image").tag("@regress");

Scenario("Two RectangleLabels", async ({ I, LabelStudio, AtLabels, AtOutliner }) => {
  I.amOnPage("/");
  LabelStudio.init({ config, data });

  LabelStudio.waitForObjectsReady();

  AtLabels.clickLabel("Plane");
  I.executeScript(dragKonva, [300, 300, 50, 50]);
  AtLabels.clickLabel("Car");
  I.executeScript(dragKonva, [100, 600, 400, -300]);
  AtOutliner.seeRegions(2);

  const result = await I.executeScript(serialize);

  assert.deepStrictEqual(result.length, 2);
});
