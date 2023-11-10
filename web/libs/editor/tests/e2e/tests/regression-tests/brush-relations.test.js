Feature('Brush relations').tag('@regress');

const IMAGE = 'https://user.fm/files/v2-901310d5cb3fa90e0616ca10590bacb3/spacexmoon-800x501.jpg';

const config = `<View>
    <Image name="img" value="$image"></Image>
    <BrushLabels name="tag" toName="img">
        <Label value="Test" background="orange"></Label>
    </BrushLabels>
  </View>`;

function getPointAtSpiral(t, v , w) {
  return { x: v * t * Math.cos(w * t), y: v * t * Math.sin(w * t) };
}

function generateSpiralPoints(x0, y0, R, v , w) {
  let t = 1, x, y;
  const points = [];

  do {
    ({ x, y } = getPointAtSpiral(t++, v, w));
    points.push([x + x0, y + y0]);
  } while (x ** 2 + y ** 2 < R ** 2);
  return points;
}

Scenario('Brush relations shouldn\'t crash everything', async ({ I, LabelStudio, AtImageView, AtSidebar }) => {
  const params = {
    config,
    data: { image: IMAGE },
  };

  I.amOnPage('/');
  LabelStudio.init(params);
  AtImageView.waitForImage();
  AtSidebar.seeRegions(0);
  await AtImageView.lookForStage();
  const canvasSize = await AtImageView.getCanvasSize();
  const regionsCentralPoints = [];

  // create 4 brush regions
  for (let i = 0; i < 4; i++) {
    // find start position
    const x = canvasSize.width / 4 * ((i % 2) * 2 + 1);
    const y = canvasSize.height / 4 * ((Math.floor(i / 2) % 2) * 2 + 1);
    // generate points in a spiral
    const points = generateSpiralPoints(x, y, Math.min(canvasSize.width / 6, canvasSize.height / 6), .4,  Math.PI / 18);

    // select the brush label
    I.pressKey('1');
    // draw a brush region
    AtImageView.drawThroughPoints(points);
    AtSidebar.seeRegions(i+1);
    // unselect the region
    I.pressKey('u');
    // save the central point
    regionsCentralPoints.push({ x, y });
  }

  // Check that we can create a relation between the brush regions
  {
    // switch to the move tool for easy region selecting
    I.pressKey('v');
    // select the first region
    AtImageView.clickAt(regionsCentralPoints[0].x, regionsCentralPoints[0].y);
    // create relation to the second region
    I.pressKey(['alt', 'r']);
    AtImageView.clickAt(regionsCentralPoints[1].x, regionsCentralPoints[1].y);
    // check that the relation has been created
    AtSidebar.seeRelations(1);
  }

  // Check that relations work fine on a brush restoration (from rle)
  {
    // export annotation
    const annotation = await LabelStudio.serialize();

    // reload LS with that datalabel studio logo
    LabelStudio.init({
      ...params,
      annotations: [{ id: 'imported', result: annotation }],
    });

    AtImageView.waitForImage();
    // Check that relation still exist
    AtSidebar.seeRelations(1);

    // Try to create new relation with restored regions
    {
      // switch to the move tool for easy region selecting
      I.pressKey('v');
      // select the third region
      AtImageView.clickAt(regionsCentralPoints[2].x, regionsCentralPoints[2].y);
      // create relation to the fourth region
      I.pressKey(['alt', 'r']);
      AtImageView.clickAt(regionsCentralPoints[3].x, regionsCentralPoints[3].y);
      // check that the relation has been created
      AtSidebar.seeRelations(2);
    }

    /// The potential errors should be caught by `errorsCollector` plugin
  }
});
