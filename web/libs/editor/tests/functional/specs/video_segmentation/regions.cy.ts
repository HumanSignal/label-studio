import { Labels, LabelStudio, Sidebar, VideoView } from '@heartexlabs/ls-test/helpers/LSF/index';
import { simpleVideoConfig, simpleVideoData, simpleVideoResult } from 'data/video_segmentation/regions';

describe('Video segmentation', () => {
  it('Should be able to draw a simple rectangle', ()=>{
    LabelStudio.params()
      .config(simpleVideoConfig)
      .data(simpleVideoData)
      .withResult([])
      .init();

    LabelStudio.waitForObjectsReady();
    Sidebar.hasNoRegions();

    Labels.select('Label 1');

    VideoView.drawRectRelative(.2, .2, .6, .6);

    Sidebar.hasRegions(1);
  });

  it('Should have changes in canvas', () => {
    LabelStudio.params()
      .config(simpleVideoConfig)
      .data(simpleVideoData)
      .withResult([])
      .init();
    LabelStudio.waitForObjectsReady();
    Sidebar.hasNoRegions();
    VideoView.captureCanvas('canvas');

    Labels.select('Label 2');
    VideoView.drawRectRelative(.2, .2, .6, .6);
    Sidebar.hasRegions(1);
    VideoView.canvasShouldChange('canvas', 0);
  });

  describe('Rectangle', () => {
    it('Should be invisible out of the lifespan', () =>{
      LabelStudio.params()
        .config(simpleVideoConfig)
        .data(simpleVideoData)
        .withResult(simpleVideoResult)
        .init();
      LabelStudio.waitForObjectsReady();
      Sidebar.hasRegions(1);
      VideoView.captureCanvas('canvas');

      VideoView.clickAtFrame(4);
      VideoView.canvasShouldChange('canvas', 0);
    });
  });

  describe('Transformer', () => {
    it.only('Should be invisible out of the lifespan', () =>{
      LabelStudio.params()
        .config(simpleVideoConfig)
        .data(simpleVideoData)
        .withResult(simpleVideoResult)
        .init();
      LabelStudio.waitForObjectsReady();
      Sidebar.hasRegions(1);

      cy.log('Remember an empty canvas state');
      VideoView.clickAtFrame(4);
      VideoView.captureCanvas('canvas');

      VideoView.clickAtFrame(3);
      cy.log('Select region');
      VideoView.clickAtRelative(.5,.5);
      Sidebar.hasSelectedRegions(1);
      VideoView.clickAtFrame(4);
      Sidebar.hasSelectedRegions(1);
      VideoView.canvasShouldNotChange('canvas', 0);
    });
  });
});