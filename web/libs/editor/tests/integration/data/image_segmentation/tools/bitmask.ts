export const bitmaskImageData = {
  image: "/public/files/images/0030019819f25b28.jpg",
};

export const bitmaskConfig = `
<View>
  <Image name="img" value="$image" smoothing="false" />
  <BitmaskLabels name="tag" toName="img">
    <Label value="Test" background="orange" />
  </BitmaskLabels>
</View>
`;
