export const simpleTextConfig = `<View>
  <Text name="text" value="$text"/>
  <Labels name="tag" toName="text">
    <Label value="region" background="green"/>
  </Labels>
</View>`;

export const simpleHyperTextConfig = `<View>
  <HyperText name="text" value="$text"/>
  <Labels name="tag" toName="text">
    <Label value="region" background="green"/>
  </Labels>
</View>`;

export const simpleTextData = {
  // It should be some warning emoji but biome hates them
  text: "🐱 Warning: This is a test text",
};

export const multilineTextData = {
  // It should be some warning emoji but biome hates them
  text: "🐱 Warning:\n🐱 This is a test text",
};

export const simpleHyperTextData = {
  text: "<article><h2>🐱 Warning:</h2> <p>🐱 This is a test text</p></article>",
};
