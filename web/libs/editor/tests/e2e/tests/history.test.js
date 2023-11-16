Feature('Time traveling');

const IMAGE = 'https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg';

Scenario('Travel through history with the selected brush region', async function({ I, LabelStudio, AtImageView, AtSidebar }) {
  I.amOnPage('/');
  LabelStudio.init({
    data: { image: IMAGE },
    config: `<View>
      <Image name="img" value="$image" defaultZoom="auto"/>
      <Brush name="tag" toName="img" />
      <Labels name="labels">
        <Label value="1"></Label>
      </Labels>
    </View>`,
  });

  await AtImageView.waitForImage();

  AtSidebar.seeRegions(0);
  AtSidebar.dontSeeSelectedRegion();

  I.say('Draw a brush region');
  await AtImageView.lookForStage();

  AtSidebar.selectTool('brush');

  AtImageView.drawThroughPoints([
    [50, 50], [100, 50], [50, 80],
  ]);

  AtSidebar.seeRegions(1);
  AtSidebar.seeSelectedRegion();

  I.say('Add a brush stroke to the last created region (2 strokes, 1 region)');
  AtImageView.drawThroughPoints([
    [50, 100], [100, 100], [50, 130],
  ]);

  I.say('Check that we are drawing in the same region');
  AtSidebar.seeRegions(1);
  AtSidebar.seeSelectedRegion();

  I.say('Go back through history');
  I.pressKey(['CommandOrControl', 'z']);

  I.say('The brush region still should be selected (1 stroke, 1 region)');
  AtSidebar.seeRegions(1);
  AtSidebar.seeSelectedRegion();

  I.say('Try the same with redo');
  I.pressKey(['CommandOrControl', 'shift', 'z']);

  I.say('The brush region still should be selected (2 strokes, 1 region)');
  AtSidebar.seeRegions(1);
  AtSidebar.seeSelectedRegion();
});

Scenario('Travel through history after moving the rectangle region', async function({ I, LabelStudio, AtImageView, AtSidebar }) {
  I.amOnPage('/');
  LabelStudio.init({
    data: { image: IMAGE },
    config: `<View>
    <Image name="img" value="$image" defaultZoom="auto" />
    <Rectangle name="tag" toName="img" />
    <Labels name="labels">
        <Label value="1"></Label>
    </Labels>
  </View>`,
  });
  await AtImageView.waitForImage();
  AtSidebar.seeRegions(0);
  AtSidebar.dontSeeSelectedRegion();

  I.say('Draw a rectangle region');
  await AtImageView.lookForStage();
  AtSidebar.selectTool('rectangle');
  AtImageView.drawByDrag(100,100,200,200);

  I.say('Select the region');
  AtImageView.clickAt(150,150);

  I.say('Check that the region is created and selected');
  AtSidebar.seeRegions(1);
  AtSidebar.seeSelectedRegion();

  I.say('Move the last created region 2 times');
  AtImageView.drawByDrag(200,200,100,0);
  AtImageView.drawByDrag(300,200,0,-100);

  I.say('When we move region we should do not create any other region or loose the selection (moved 2 times)');
  AtSidebar.seeRegions(1);
  AtSidebar.seeSelectedRegion();

  I.say('Go back through history');
  I.pressKey(['CommandOrControl', 'z']);

  I.say('The rectangle region still should be selected (moved 1 time)');
  AtSidebar.seeRegions(1);
  AtSidebar.seeSelectedRegion();

  I.say('Repeat going back through history');
  I.pressKey(['CommandOrControl', 'z']);

  I.say('The rectangle region still should be selected (moved 0 times)');
  AtSidebar.seeRegions(1);
  AtSidebar.seeSelectedRegion();

  I.say('Try the same with redo');
  I.pressKey(['CommandOrControl', 'shift', 'z']);

  I.say('The brush region still should be selected (moved 1 time)');
  AtSidebar.seeRegions(1);
  AtSidebar.seeSelectedRegion();
});
