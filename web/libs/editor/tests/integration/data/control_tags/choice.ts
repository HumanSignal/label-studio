export const simpleData = {
  text: 'This text exists for no reason',
};
export const choicesConfig = `<View>
  <Text name="text" value="$text" />
  <Choices name="choices" toName="text" choice="single">
    <Choice value="Choice 1" />
    <Choice value="Choice 2" hint="A hint for Choice 2" />
    <Choice value="Choice 3" />
  </Choices>
</View>`;

export const choicesMultipleSelectionConfig = `<View>
  <Text name="text" value="$text" />
  <Choices name="choices" toName="text" choice="multiple">
    <Choice value="Choice 1" />
    <Choice value="Choice 2" hint="A hint for Choice 2" />
    <Choice value="Choice 3" />
  </Choices>
</View>`;

export const choicesSelectLayoutConfig = `<View>
  <Text name="text" value="$text" />
  <Choices name="choices" toName="text" layout="select" choice="multiple">
    <Choice value="Choice 1" />
    <Choice value="Choice 2" hint="A hint for Choice 2" />
    <Choice value="Choice 3" />
  </Choices>
</View>`;