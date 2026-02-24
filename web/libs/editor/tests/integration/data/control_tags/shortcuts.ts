export const AUDIO_URL = "/public/files/barradeen-emotional.mp3";

export const shortcutTextareaConfig = (rows = 1) => `
<View>
  <TextArea name="text" toName="audio" editable="true" rows="${rows}">
    <Shortcut alias="[-]" value="-" hotkey="1" />
    <Shortcut alias="[ + ]" value=" + " hotkey="2" />
    <Shortcut alias="[!]" value="!" hotkey="3" />
    <Shortcut alias="[make a ninja]" value="‍👤" hotkey="4" />
  </TextArea>
  <Audio name="audio" value="$audio"/>
</View>
`;

export const shortcutTextareaData = {
  audio: AUDIO_URL,
};

export const simpleChoicesConfig = `
<View>
  <Text name="text" value="$text"/>
  <Choices name="choices" toName="text">
    <Choice value="Click me" hotkey="5" />
  </Choices>
</View>
`;

export const simpleChoicesData = {
  text: "",
};
