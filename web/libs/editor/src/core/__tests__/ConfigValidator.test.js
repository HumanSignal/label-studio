/* global it, expect */
import Tree from "../Tree";
import "../../tags/object/Image";
import "../../tags/object/RichText";
import "../../tags/control/RectangleLabels";
import "../../tags/control/Label";

// IMPORTANT NOTE
// all tests are disabled because they wait `validation` in the root component
// and this doesn't happen, may be that was some old behavior
// @todo fix this

it.skip("Should fail if a tag referenced by toName doesn't exist", () => {
  const result = Tree.treeToModel(`
  <View>
    <Image name="img1" value="$image"></Image>
    <RectangleLabels name="tag" toName="img" fillOpacity="0.5" strokeWidth="5">
      <Label value="Planet"></Label>
      <Label value="Moonwalker" background="blue"></Label>
    </RectangleLabels>
  </View>
  `);

  const errorItem = result.validation[0];

  expect(errorItem.error).toBe("ERR_TAG_NOT_FOUND");
});

it.skip("Should fail if a tag referenced by toName is not image", () => {
  const result = Tree.treeToModel(`
  <View>
    <HyperText name="img" value="$text"></HyperText>
    <RectangleLabels name="tag" toName="img" fillOpacity="0.5" strokeWidth="5">
      <Label value="Planet"></Label>
      <Label value="Moonwalker" background="blue"></Label>
    </RectangleLabels>
  </View>
  `);

  const errorItem = result.validation[0];

  expect(errorItem.error).toBe("ERR_TAG_UNSUPPORTED");
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

it.skip("Should fail if opacity attribute is out of range", () => {
  const result = Tree.treeToModel(`
  <View>
    <Image name="img" value="$image"></Image>
    <RectangleLabels name="tag" toName="img" fillOpacity="-1" strokeWidth="5">
      <Label value="Planet"></Label>
      <Label value="Moonwalker" background="blue"></Label>
    </RectangleLabels>
  </View>
  `);

  const errorItem = result.validation[0];

  expect(errorItem.error).toBe("ERR_BAD_TYPE");
});

it.skip("Should fail if color is not a proper CSS color", () => {
  const result = Tree.treeToModel(`
  <View>
    <Image name="img" value="$image"></Image>
    <RectangleLabels name="tag" toName="img" fillOpacity="0.6" strokeWidth="5">
      <Label value="Planet"></Label>
      <Label value="Moonwalker" background="verywrongcolor"></Label>
    </RectangleLabels>
  </View>
  `);

  const errorItem = result.validation[0];

  expect(errorItem.error).toBe("ERR_BAD_TYPE");
});
