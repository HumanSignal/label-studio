import { generateSampleTaskFromConfig } from "../generateSampleTask";

describe("generateSampleTaskFromConfig", () => {
  it("should handle empty config", async () => {
    const result = await generateSampleTaskFromConfig("");
    expect(result).toEqual({
      id: 1,
      data: {},
      annotations: [{ id: 1, result: [] }],
      predictions: [],
    });
  });

  it("should handle invalid XML", async () => {
    const result = await generateSampleTaskFromConfig("<invalid>");
    expect(result).toEqual({
      id: 1,
      data: {},
      annotations: [{ id: 1, result: [] }],
      predictions: [],
    });
  });

  it("should generate sample data for image config", async () => {
    const config = `
      <View>
        <Image name="image" value="$image"/>
        <RectangleLabels name="labels" toName="image">
          <Label value="Person" background="#ff0000"/>
          <Label value="Car" background="#00ff00"/>
        </RectangleLabels>
      </View>
    `;
    const result = await generateSampleTaskFromConfig(config);
    expect(result.data).toHaveProperty("image");
    expect(result.data.image).toBe("https://labelstud.io/static/samples/sample.jpg");
  });

  it("should generate sample data for audio config", async () => {
    const config = `
      <View>
        <Audio name="audio" value="$audio"/>
        <Labels name="labels" toName="audio">
          <Label value="Speech" background="#ff0000"/>
          <Label value="Music" background="#00ff00"/>
        </Labels>
      </View>
    `;
    const result = await generateSampleTaskFromConfig(config);
    expect(result.data).toHaveProperty("audio");
    expect(result.data.audio).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/9/9d/Bach_-_Cello_Suite_no._1_in_G_major,_BWV_1007_-_I._Pr%C3%A9lude.ogg",
    );
  });

  it("should generate sample data for text config", async () => {
    const config = `
      <View>
        <Text name="text" value="$text"/>
        <Labels name="labels" toName="text">
          <Label value="Positive" background="#ff0000"/>
          <Label value="Negative" background="#00ff00"/>
        </Labels>
      </View>
    `;
    const result = await generateSampleTaskFromConfig(config);
    expect(result.data).toHaveProperty("text");
    expect(result.data.text).toBe("Sample: Your text will go here.");
  });

  it("should handle user data in comments", async () => {
    const config = `
      <View>
        <Text name="text" value="$text"/>
      </View>
      <!-- {"data": {"text": "Custom sample text"}} -->
    `;
    const result = await generateSampleTaskFromConfig(config);
    expect(result.data).toHaveProperty("text");
    expect(result.data.text).toBe("Custom sample text");
  });

  it("should handle user annotation in comments", async () => {
    const config = `
      <View>
        <Text name="text" value="$text"/>
      </View>
      <!-- {"annotation": {"from_name": "labels", "to_name": "text", "type": "labels", "value": {"start": 0, "end": 5, "labels": ["Positive"]}}} -->
    `;
    const result = await generateSampleTaskFromConfig(config);
    expect(result.annotations).toBeDefined();
    if (result.annotations) {
      expect(result.annotations).toHaveLength(1);
      expect(result.annotations[0].result).toHaveLength(1);
      expect(result.annotations[0].result[0]).toEqual({
        from_name: "labels",
        to_name: "text",
        type: "labels",
        value: { start: 0, end: 5, labels: ["Positive"] },
      });
    }
  });

  it("should handle valueList attributes", async () => {
    const config = `
      <View>
        <Image name="image" valueList="$images"/>
        <RectangleLabels name="labels" toName="image">
          <Label value="Person" background="#ff0000"/>
        </RectangleLabels>
      </View>
    `;
    const result = await generateSampleTaskFromConfig(config);
    expect(result.data).toHaveProperty("images");
    expect(Array.isArray(result.data.images)).toBe(true);
    expect(result.data.images).toHaveLength(2);
  });

  it("should handle valueType='url' attribute", async () => {
    const config = `
      <View>
        <Text name="text" valueType="url" value="$url"/>
      </View>
    `;
    const result = await generateSampleTaskFromConfig(config);
    expect(result.data).toHaveProperty("url");
    expect(result.data.url).toBe("Sample: Your text will go here.");
  });

  it("should handle top level data in comments", async () => {
    const config = `
      <View>
        <Header value="Video timeline segmentation via Audio sync trick"/>
        <HyperText name="video" value="$video"/>
        <Labels name="tricks" toName="audio" choice="multiple">
          <Label value="Kickflip" background="#1BB500" />
          <Label value="360 Flip" background="#FFA91D" />
          <Label value="Trick" background="#358EF3" />
        </Labels>
        <Audio name="audio" value="$videoSource" speed="false"/>
      </View>

      <!--
        It's very important to prepare task data correctly,
        it includes HyperText $video and
        it must be like this example below:
      -->

      <!-- {
      "videoSource": "https://app.heartex.ai/static/samples/opossum_snow_alt.mp4"
      } -->
    `;
    const result = await generateSampleTaskFromConfig(config);
    expect(result.data).toHaveProperty("videoSource");
    expect(result.data.videoSource).toBe("https://app.heartex.ai/static/samples/opossum_snow_alt.mp4");
  });

  // app.heartex.ai was retired and now serves 502 for every sample asset, which broke
  // the playground preview on labelstud.io. Sample hosts must also send CORS headers
  // because the Image tag loads with crossOrigin="anonymous" by default.
  it("should not reference the retired app.heartex.ai host in any generated sample data", async () => {
    const configs = [
      '<View><Image name="image" value="$image"/></View>',
      '<View><Image name="image" valueList="$images"/></View>',
      '<View><Video name="video" value="$video"/></View>',
      '<View><HyperText name="pdf" value="$pdf"/></View>',
      '<View><HyperText name="video" value="$video"/></View>',
      '<View><TimeSeries name="ts" value="$csv" valueType="url" timeColumn="time"><Channel column="value"/></TimeSeries></View>',
    ];

    for (const config of configs) {
      const result = await generateSampleTaskFromConfig(config);
      const values = Object.values(result.data).flat().join(" ");

      expect(values).not.toContain("app.heartex.ai");
    }
  });
});
