export const magicWandConfig = `
<View>
  <Labels name="labels" toName="image">
    <Label hotkey="1" value="Cloud" background="#1b32de" />
    <Label hotkey="2" value="Shadow" background="#1EAE3B" />
  </Labels>
  <MagicWand name="magicwand" toName="image" />
  <Image name="image" value="$image" zoomControl="true" zoom="true" />
</View>
`;

export const magicWandData = {
  image: "/public/files/images/magic_wand_scale_1.jpg",
};
