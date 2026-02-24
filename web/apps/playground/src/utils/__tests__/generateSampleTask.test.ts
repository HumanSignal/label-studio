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
    expect(result.data.image).toBe("https://app.heartex.ai/static/samples/sample.jpg");
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

  it("should handle ReactCode with data attribute and inputs schema", async () => {
    const config = `
      <View>
        <ReactCode name="custom" data="$myData" inputs='{"type": "object", "properties": {"name": {"type": "string"}, "age": {"type": "integer"}}}' />
      </View>
    `;
    const result = await generateSampleTaskFromConfig(config);
    expect(result.data).toHaveProperty("myData");
    expect(result.data.myData).toEqual({
      name: "Sample text value",
      age: 50,
    });
  });

  it("should handle ReactCode without data attribute - merge at root level", async () => {
    const config = `
      <View>
        <ReactCode name="custom" inputs='{"type": "object", "properties": {"title": {"type": "string"}, "count": {"type": "number"}}}' />
      </View>
    `;
    const result = await generateSampleTaskFromConfig(config);
    expect(result.data).toHaveProperty("title");
    expect(result.data).toHaveProperty("count");
    expect(result.data.title).toBe("Sample text value");
    expect(result.data.count).toBe(50);
  });

  it("should handle ReactCode with nested object schema", async () => {
    const config = `
      <View>
        <ReactCode name="custom" data="$formData" inputs='{"type": "object", "properties": {"user": {"type": "object", "properties": {"email": {"type": "string", "format": "email"}, "verified": {"type": "boolean"}}}}}' />
      </View>
    `;
    const result = await generateSampleTaskFromConfig(config);
    expect(result.data).toHaveProperty("formData");
    expect(result.data.formData).toEqual({
      user: {
        email: "sample@example.com",
        verified: true,
      },
    });
  });

  it("should handle ReactCode with array schema", async () => {
    const config = `
      <View>
        <ReactCode name="custom" data="$items" inputs='{"type": "array", "items": {"type": "object", "properties": {"id": {"type": "integer"}, "label": {"type": "string"}}}}' />
      </View>
    `;
    const result = await generateSampleTaskFromConfig(config);
    expect(result.data).toHaveProperty("items");
    expect(Array.isArray(result.data.items)).toBe(true);
    expect(result.data.items).toHaveLength(2);
    expect(result.data.items[0]).toEqual({ id: 50, label: "Sample text value" });
  });

  it("should handle CustomInterface with inputs schema", async () => {
    const config = `
      <View>
        <CustomInterface name="custom" data="$content" inputs='{"type": "object", "properties": {"message": {"type": "string"}}}' />
      </View>
    `;
    const result = await generateSampleTaskFromConfig(config);
    expect(result.data).toHaveProperty("content");
    expect(result.data.content).toEqual({ message: "Sample text value" });
  });

  it("should not overwrite existing data when merging ReactCode inputs", async () => {
    const config = `
      <View>
        <Text name="text" value="$title"/>
        <ReactCode name="custom" inputs='{"type": "object", "properties": {"title": {"type": "string"}, "extra": {"type": "boolean"}}}' />
      </View>
    `;
    const result = await generateSampleTaskFromConfig(config);
    // Title should be from Text tag, not ReactCode
    expect(result.data.title).toBe("Sample: Your text will go here.");
    // Extra should be from ReactCode
    expect(result.data.extra).toBe(true);
  });

  it("should handle ReactCode with enum values in schema", async () => {
    const config = `
      <View>
        <ReactCode name="custom" data="$settings" inputs='{"type": "object", "properties": {"status": {"type": "string", "enum": ["active", "inactive", "pending"]}}}' />
      </View>
    `;
    const result = await generateSampleTaskFromConfig(config);
    expect(result.data).toHaveProperty("settings");
    expect(result.data.settings.status).toBe("active");
  });

  it("should handle ReactCode with shorthand properties schema", async () => {
    const config = `
      <View>
        <ReactCode name="custom" data="$myData" inputs='{"properties": {"name": {"type": "string"}}}' />
      </View>
    `;
    const result = await generateSampleTaskFromConfig(config);
    expect(result.data).toHaveProperty("myData");
    expect(result.data.myData).toEqual({ name: "Sample text value" });
  });
});
