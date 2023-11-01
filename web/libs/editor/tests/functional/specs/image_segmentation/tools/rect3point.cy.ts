import { ImageView, LabelStudio } from '@heartexlabs/ls-test/helpers/LSF';
import { rect3Config, simpleImageData } from '../../../data/image_segmentation/tools/rect3point';
import { FF_DEV_2132, FF_DEV_3793 } from '../../../../../src/utils/feature-flags';

describe('Rect3Point tool', () => {
  beforeEach(() => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      [FF_DEV_3793]: true,
      [FF_DEV_2132]: true,
    });
  });
  it('Should be able to draw region with rotation 0', () => {
    LabelStudio.params()
      .config(rect3Config)
      .data(simpleImageData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    ImageView.selectRect3PointToolByHotkey();

    ImageView.clickAtRelative(.1,.1);
    ImageView.clickAtRelative(.2,.1);
    ImageView.clickAtRelative(.2,.2);

    LabelStudio.serialize().then(([result]) => {
      expect(result.value.x).to.be.closeTo(10, 0.1);
      expect(result.value.y).to.be.closeTo(10, 0.1);
      expect(result.value.height).to.be.closeTo(10, 0.1);
      expect(result.value.width).to.be.closeTo(10, 0.1);
      expect(result.value.rotation).to.be.eq(0);
    });
  });
  it('Should be able to draw region with rotation 90', () => {
    LabelStudio.params()
      .config(rect3Config)
      .data(simpleImageData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    ImageView.selectRect3PointToolByHotkey();

    ImageView.clickAtRelative(.8,.2);
    ImageView.clickAtRelative(.8,.8);
    ImageView.clickAtRelative(.2,.8);


    LabelStudio.serialize().then(([result]) => {
      expect(result.value.x).to.be.closeTo(80, 0.2);
      expect(result.value.y).to.be.closeTo(20, 0.2);
      expect(result.value.rotation).to.be.eq(90);
    });

  });
  it('Should be able to draw region with rotation 180', () => {
    LabelStudio.params()
      .config(rect3Config)
      .data(simpleImageData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    ImageView.selectRect3PointToolByHotkey();

    ImageView.clickAtRelative(.6,.6);
    ImageView.clickAtRelative(.4,.6);
    ImageView.clickAtRelative(.4,.4);


    LabelStudio.serialize().then(([result]) => {
      expect(result.value.x).to.be.closeTo(60, 0.1);
      expect(result.value.y).to.be.closeTo(60, 0.1);
      expect(result.value.height).to.be.closeTo(20, 0.1);
      expect(result.value.width).to.be.closeTo(20, 0.1);
      expect(result.value.rotation).to.be.eq(180);
    });

  });
  it('Should be able to draw region with rotation 270', () => {
    LabelStudio.params()
      .config(rect3Config)
      .data(simpleImageData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    ImageView.selectRect3PointToolByHotkey();

    ImageView.clickAtRelative(.1,.2);
    ImageView.clickAtRelative(.1,.1);
    ImageView.clickAtRelative(.2,.1);


    LabelStudio.serialize().then(([result]) => {
      expect(result.value.x).to.be.closeTo(10, 0.2);
      expect(result.value.y).to.be.closeTo(20, 0.2);
      expect(result.value.rotation).to.be.eq(270);
    });
    
  });
  it('Should be able to draw region with rotation 45+90*k deg', () => {
    LabelStudio.params()
      .config(rect3Config)
      .data(simpleImageData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    ImageView.selectRect3PointToolByHotkey();
    //45deg
    ImageView.clickAt(100,50);
    ImageView.clickAt(150,100);
    ImageView.clickAt(100,150);
    //135deg
    ImageView.clickAt(350,100);
    ImageView.clickAt(300,150);
    ImageView.clickAt(250,100);
    //225deg
    ImageView.clickAt(100,350);
    ImageView.clickAt(50,300);
    ImageView.clickAt(100,250);
    //315deg
    ImageView.clickAt(250,300);
    ImageView.clickAt(300,250);
    ImageView.clickAt(350,300);

    LabelStudio.serialize().then((result) => {
      expect(result[0].value.rotation).to.be.eq(45);
      expect(result[1].value.rotation).to.be.eq(135);
      expect(result[2].value.rotation).to.be.eq(225);
      expect(result[3].value.rotation).to.be.eq(315);
    });
    
  });
  it('Should display line of zero height (2 points)', () => {
    LabelStudio.params()
      .config(rect3Config)
      .data(simpleImageData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    ImageView.capture('canvas');

    ImageView.selectRect3PointToolByHotkey();
    ImageView.clickAtRelative(.1, .5);
    ImageView.clickAtRelative(.8, .5);

    ImageView.canvasShouldChange('canvas', 0);
  });
  it('Should draw by dblclick at the target point', () =>{
    LabelStudio.params()
      .config(rect3Config)
      .data(simpleImageData)
      .withResult([])
      .init();

    ImageView.waitForImage();

    ImageView.clickAtRelative(.5, .5);
    ImageView.clickAtRelative(.5, .5);

    LabelStudio.serialize().then(([result]) => {
      expect(result.value.x).to.be.closeTo(50, 0.1);
      expect(result.value.y).to.be.closeTo(50, 0.1);
      expect(result.value.rotation).to.be.eq(0);
    });
  });
});
