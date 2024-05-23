/* global it, expect */
import Tree from "../Tree";
import "../../tags/object/Image";
import "../../tags/object/RichText";
import "../../tags/control/RectangleLabels";
import "../../tags/control/Label";
import "../../tags/control/Choices";
import "../../tags/control/Choice";
import "../../tags/visual/Header";
import { ConfigValidator } from "../DataValidator/ConfigValidator";

it("Should fail if a tag referenced by toName doesn't exist", () => {
  const result = ConfigValidator.validate(
    Tree.treeToModel(
      `
  <View>
    <Image name="img1" value="$image"></Image>
    <RectangleLabels name="tag" toName="img" fillOpacity="0.5" strokeWidth="5">
      <Label value="Planet"></Label>
      <Label value="Moonwalker" background="blue"></Label>
    </RectangleLabels>
  </View>
  `,
      {},
    ),
  );

  expect(result[0].error).toBe("ERR_TAG_NOT_FOUND");
});

it("Should fail if a tag referenced by toName is not image", () => {
  const result = ConfigValidator.validate(
    Tree.treeToModel(
      `
  <View>
    <HyperText name="img" value="$text"></HyperText>
    <RectangleLabels name="tag" toName="img" fillOpacity="0.5" strokeWidth="5">
      <Label value="Planet"></Label>
      <Label value="Moonwalker" background="blue"></Label>
    </RectangleLabels>
  </View>
  `,
      {},
    ),
  );

  expect(result[0].error).toBe("ERR_TAG_UNSUPPORTED");
});

it.skip("Should fail if tag lacks mandatory attribute toName", () => {
  const result = Tree.treeToModel(`
  <View>
    <Image name="img" value="$image"></Image>
    <RectangleLabels name="tag" fillOpacity="0.5" strokeWidth="5">
      <Label value="Planet"></Label>
      <Label value="Moonwalker" background="blue"></Label>
    </RectangleLabels>
  </View>
  `);

  const errorItem = result.validation[0];

  expect(errorItem.error).toBe("ERR_REQUIRED");
});

it("Should fail if opacity attribute is out of range", () => {
  const result = ConfigValidator.validate(
    Tree.treeToModel(
      `
  <View>
    <Image name="img" value="$image"></Image>
    <RectangleLabels name="tag" toName="img" fillOpacity="-1" strokeWidth="5">
      <Label value="Planet"></Label>
      <Label value="Moonwalker" background="blue"></Label>
    </RectangleLabels>
  </View>
  `,
      {},
    ),
  );

  expect(result[0].error).toBe("ERR_BAD_TYPE");
});

it("Should fail if color is not a proper CSS color", () => {
  const result = ConfigValidator.validate(
    Tree.treeToModel(
      `
  <View>
    <Image name="img" value="$image"></Image>
    <RectangleLabels name="tag" toName="img" fillOpacity="0.6" strokeWidth="5">
      <Label value="Planet"></Label>
      <Label value="Moonwalker" background="verywrongcolor"></Label>
    </RectangleLabels>
  </View>
  `,
      {},
    ),
  );

  expect(result[0].error).toBe("ERR_BAD_TYPE");
});

it.skip("Should fail if visual tags have name attribute", () => {
  const result = ConfigValidator.validate(
    Tree.treeToModel(
      `
    <View>
      <Header name="w3"/>
      <Text name="text1" value="Did the agent follow up to ensure that both parties were satisfied with the outcome and understood the resolution"/>
      <Image name="image" value="$image" zoom="true"/>
      <Choices name="choice" toName="label" choice="single">
        <Choice value="Yes"/>
        <Choice value="No"/>
      </Choices>
      <PolygonLabels name="label" toName="image"
                     strokeWidth="3" pointSize="small"
                     opacity="0.9">
        <Label value="Airplane" background="red"/>
        <Label value="Car" background="blue"/>
      </PolygonLabels>
    </View>
  `,
      {},
    ),
  );

  expect(result[0].error).toBe("ERR_GENERAL");
  expect(result[0].value).toBe("Attribute <b>name</b> is not allowed for tag <b>Header</b>.");
});
