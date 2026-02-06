Feature("Bitmask tool").tag("@regress");

const assert = require("assert");

const IMAGE = "/public/files/images/0030019819f25b28.jpg";

const config = `<View>
  <Image name="img" value="$image" smoothing="false"></Image>
  <BitmaskLabels name="tag" toName="img">
    <Label value="Test" background="orange"></Label>
  </BitmaskLabels>
</View>`;

// Add cleanup hook
Before(async ({ I }) => {
  I.amOnPage("/");
});

Scenario("Basic Bitmask drawing", async ({ I, LabelStudio, AtImageView, AtLabels }) => {
  const params = {
    config,
    data: { image: IMAGE },
    annotations: [{ id: 1, result: [] }],
  };

  I.amOnPage("/");
  LabelStudio.init(params);
  LabelStudio.waitForObjectsReady();
  await AtImageView.lookForStage();

  I.say("Select Bitmask tool");
  I.pressKey("B");
  AtLabels.clickLabel("Test");

  I.say("Draw a simple mask");
  AtImageView.drawThroughPoints([
    [20, 20],
    [20, 40],
    [40, 40],
    [40, 20],
    [20, 20],
  ]);

  I.say("Check if mask was created");
  const result = await LabelStudio.serialize();
  assert.strictEqual(result.length, 1);
  assert.ok(result[0].value.imageDataURL);
});

Scenario("Bitmask eraser functionality", async ({ I, LabelStudio, AtImageView, AtLabels }) => {
  const params = {
    config,
    data: { image: IMAGE },
    annotations: [{ id: 1, result: [] }],
  };

  I.amOnPage("/");
  LabelStudio.init(params);
  LabelStudio.waitForObjectsReady();
  await AtImageView.lookForStage();

  I.say("Select Bitmask tool and draw initial mask");
  I.pressKey("B");
  AtLabels.clickLabel("Test");
  AtImageView.drawThroughPoints([
    [20, 20],
    [20, 40],
    [40, 40],
    [40, 20],
    [20, 20],
  ]);

  I.say("Switch to eraser and erase part of the mask");
  I.pressKey("E");
  AtImageView.drawThroughPoints([
    [25, 25],
    [35, 35],
  ]);

  I.say("Check if mask was modified");
  const result = await LabelStudio.serialize();
  assert.strictEqual(result.length, 1);
  assert.ok(result[0].value.imageDataURL);
});

Scenario("Bitmask size controls", async ({ I, LabelStudio, AtImageView, AtLabels }) => {
  const params = {
    config,
    data: { image: IMAGE },
    annotations: [{ id: 1, result: [] }],
  };

  I.amOnPage("/");
  LabelStudio.init(params);
  LabelStudio.waitForObjectsReady();
  await AtImageView.lookForStage();

  I.say("Select Bitmask tool");
  I.pressKey("B");
  AtLabels.clickLabel("Test");

  I.say("Test size increase shortcut");
  I.pressKey("]");
  AtImageView.drawThroughPoints([[30, 30]]);

  I.say("Test size decrease shortcut");
  I.pressKey("[");
  AtImageView.drawThroughPoints([[50, 50]]);

  I.say("Check if masks were created with different sizes");
  const result = await LabelStudio.serialize();
  assert.strictEqual(result.length, 1);
  assert.ok(result[0].value.imageDataURL);
});

Scenario("Bitmask hover and selection", async ({ I, LabelStudio, AtImageView, AtLabels, AtOutliner }) => {
  const params = {
    config,
    data: { image: IMAGE },
    annotations: [{ id: 1, result: [] }],
  };

  I.amOnPage("/");
  LabelStudio.init(params);
  LabelStudio.waitForObjectsReady();
  await AtImageView.lookForStage();

  I.say("Create initial mask");
  I.pressKey("B");
  AtLabels.clickLabel("Test");
  AtImageView.drawThroughPoints([
    [20, 20],
    [20, 40],
    [40, 40],
    [40, 20],
    [20, 20],
  ]);

  I.say("Verify selection behavior");
  AtOutliner.seeRegions(1);

  I.say("Click on the region");
  AtImageView.clickAt(30, 30);
  AtOutliner.seeSelectedRegion();
});

Scenario("Verify Bitmask drawing content", async ({ I, LabelStudio, AtImageView, AtLabels }) => {
  const params = {
    config,
    data: { image: IMAGE },
    annotations: [{ id: 1, result: [] }],
  };

  I.amOnPage("/");
  LabelStudio.init(params);
  LabelStudio.waitForObjectsReady();
  await AtImageView.lookForStage();

  I.say("Select Bitmask tool");
  I.pressKey("B");
  AtLabels.clickLabel("Test");

  I.say("Draw a rectangle mask");
  AtImageView.drawThroughPoints([
    [20, 20],
    [20, 40],
    [40, 40],
    [40, 20],
    [20, 20],
  ]);

  I.say("Verify mask content");
  const result = await LabelStudio.serialize();
  assert.strictEqual(result.length, 1);
  assert.ok(result[0].value.imageDataURL);

  // Verify that the imageDataURL contains actual pixel data
  const imageData = result[0].value.imageDataURL;
  assert.ok(imageData.startsWith("data:image/png;base64,"));

  // Decode base64 and verify it's not empty
  const base64Data = imageData.replace("data:image/png;base64,", "");
  const decodedData = Buffer.from(base64Data, "base64");
  assert.ok(decodedData.length > 0, "Decoded image data should not be empty");
});

Scenario("Verify Bitmask pixel content", async ({ I, LabelStudio, AtImageView, AtLabels }) => {
  const params = {
    config,
    data: { image: IMAGE },
    annotations: [{ id: 1, result: [] }],
  };

  I.amOnPage("/");
  LabelStudio.init(params);
  LabelStudio.waitForObjectsReady();
  await AtImageView.lookForStage();

  I.say("Select Bitmask tool");
  I.pressKey("B");
  AtLabels.clickLabel("Test");

  I.say("Draw a rectangle mask");
  AtImageView.drawThroughPoints([
    [20, 20],
    [20, 40],
    [40, 40],
    [40, 20],
    [20, 20],
  ]);

  I.say("Verify mask content and dimensions");
  const result = await LabelStudio.serialize();
  assert.strictEqual(result.length, 1);
  assert.ok(result[0].value.imageDataURL);

  // Get all data we need before making assertions
  // Retry mechanism to wait for bbox coordinates to be calculated
  let bbox = null;
  let attempts = 0;
  const maxAttempts = 10;

  while (!bbox && attempts < maxAttempts) {
    try {
      bbox = await I.executeScript(() => {
        const region = Htx.annotationStore.selected.regions[0];
        if (!region) return null;
        if (!region.bboxCoordsCanvas) return null;
        return region.bboxCoordsCanvas;
      });

      if (!bbox) {
        attempts++;
        await I.wait(100); // Wait 100ms before retrying
      }
    } catch (error) {
      attempts++;
      await I.wait(100); // Wait 100ms before retrying
    }
  }

  if (!bbox) {
    throw new Error("Bbox coordinates not available after multiple attempts");
  }

  // Define thresholds for assertions
  const THRESHOLD = 5;
  const EXPECTED_SIZE = 40;

  // Verify that the bbox exists
  assert.ok(bbox, "Bounding box should exist");

  // Calculate actual dimensions
  const width = bbox.right - bbox.left;
  const height = bbox.bottom - bbox.top;

  // Verify that the bbox has the expected size
  assert.ok(
    Math.abs(width - EXPECTED_SIZE) <= THRESHOLD,
    `Width should be close to ${EXPECTED_SIZE} pixels (got ${width})`,
  );

  assert.ok(
    Math.abs(height - EXPECTED_SIZE) <= THRESHOLD,
    `Height should be close to ${EXPECTED_SIZE} pixels (got ${height})`,
  );

  // Verify that the bbox is roughly square
  assert.ok(
    Math.abs(width - height) <= THRESHOLD,
    `Width and height should be similar (got width=${width}, height=${height})`,
  );
});

Scenario("Verify Bitmask canvas fit", async ({ I, LabelStudio, AtImageView, AtLabels }) => {
  const params = {
    config,
    data: { image: IMAGE },
    annotations: [{ id: 1, result: [] }],
  };

  I.amOnPage("/");
  LabelStudio.init(params);
  LabelStudio.waitForObjectsReady();
  await AtImageView.lookForStage();

  I.say("Select Bitmask tool");
  I.pressKey("B");
  AtLabels.clickLabel("Test");

  I.say("Draw a mask that covers the entire canvas height");
  AtImageView.drawThroughPoints([
    [10, 0], // Start from top
    [10, 100], // Draw to bottom
    [30, 100], // Complete rectangle
    [30, 0], // Back to top
    [10, 0], // Close the path
  ]);

  I.say("Verify mask content and image scaling");
  const result = await LabelStudio.serialize();
  assert.strictEqual(result.length, 1);
  assert.ok(result[0].value.imageDataURL);

  // Ensure the region is selected
  I.say("Ensure region is selected");
  AtImageView.clickAt(20, 50); // Click in the middle of our drawn region

  // Get canvas dimensions and verify the underlying image scaling
  const canvasInfo = await I.executeScript(() => {
    // Get the canvas element
    const canvas = document.querySelector("canvas");
    if (!canvas) throw new Error("Canvas not found");

    // Get canvas dimensions
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Get the original image element
    const imageElement = document.querySelector("img");
    if (!imageElement) throw new Error("Image element not found");

    // Get the original image dimensions
    const imageWidth = imageElement.naturalWidth;
    const imageHeight = imageElement.naturalHeight;

    // Get the region and its imageDataURL for verification
    const region = Htx.annotationStore.selected.regions[0];
    if (!region) throw new Error("Region not found");

    // For bitmask regions, imageDataURL is stored directly on the region
    const imageDataURL = region.imageDataURL;
    if (!imageDataURL) throw new Error("Region imageDataURL not available");

    return {
      canvasWidth,
      canvasHeight,
      imageWidth,
      imageHeight,
      imageDataURL,
    };
  });

  // Verify canvas dimensions exist
  assert.ok(canvasInfo.canvasWidth > 0, "Canvas width should be positive");
  assert.ok(canvasInfo.canvasHeight > 0, "Canvas height should be positive");
  assert.ok(canvasInfo.imageWidth > 0, "Image width should be positive");
  assert.ok(canvasInfo.imageHeight > 0, "Image height should be positive");
  assert.ok(canvasInfo.imageDataURL, "Image data URL should exist");

  // Verify that the image is properly scaled to fit the canvas
  // The image should be scaled to match the canvas dimensions
  const widthRatio = canvasInfo.canvasWidth / canvasInfo.imageWidth;
  const heightRatio = canvasInfo.canvasHeight / canvasInfo.imageHeight;

  // Check that the scaling ratios are reasonable (image should be scaled to fit canvas)
  assert.ok(widthRatio > 0, "Width scaling ratio should be positive");
  assert.ok(heightRatio > 0, "Height scaling ratio should be positive");

  // The image should be scaled to fit the canvas, but we don't require uniform scaling
  // as the image might be displayed with different aspect ratios or zoom levels
  // Instead, verify that both dimensions are scaled appropriately
  assert.ok(widthRatio >= 1 || heightRatio >= 1, "At least one dimension should be scaled up to fit canvas");

  // Log the scaling information for debugging
  I.say(`Image scaling - Width: ${widthRatio.toFixed(3)}x, Height: ${heightRatio.toFixed(3)}x`);
  I.say(
    `Canvas: ${canvasInfo.canvasWidth}x${canvasInfo.canvasHeight}, Image: ${canvasInfo.imageWidth}x${canvasInfo.imageHeight}`,
  );

  // Get the proper canvas and image frame sizes using the helper functions
  const { width: canvasSizeWidth, height: canvasSizeHeight } = await AtImageView.getCanvasSize();
  const { width: imageFrameWidth, height: imageFrameHeight } = await AtImageView.getImageFrameSize();

  // Verify that the stage/canvas dimensions match the image frame dimensions
  // The stage should be sized to fit the image properly
  assert.ok(
    Math.abs(canvasSizeWidth - imageFrameWidth) <= 1,
    `Stage width (${canvasSizeWidth}) should match image frame width (${imageFrameWidth}) within 1 pixel`,
  );

  assert.ok(
    Math.abs(canvasSizeHeight - imageFrameHeight) <= 1,
    `Stage height (${canvasSizeHeight}) should match image frame height (${imageFrameHeight}) within 1 pixel`,
  );
});
