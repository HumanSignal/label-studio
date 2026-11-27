// Config and data for VideoVectorLabels (video vector) integration tests.
// Mirrors the configuration from BROS-1396.

export const videoVectorConfig = `<View>
  <Video name="video" value="$video" framerate="25.0"/>
  <VideoVectorLabels name="labels" toName="video" minPoints="2" maxPoints="10" skeleton="true">
    <Label value="Road" />
    <Label value="Boundary" background="gold" />
    <Label value="Area51" background="cyan" />
  </VideoVectorLabels>
</View>`;

export const videoVectorData = { video: "/public/files/opossum_snow.mp4" };
