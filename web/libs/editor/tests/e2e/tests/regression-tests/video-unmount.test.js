Feature('Video unmount').tag('@regress');

Scenario('Reiniting Label Studio should not left unexpected null and video tags in DOM', async ({ I, LabelStudio }) => {
  I.amOnPage('/');
  for (let i = 0; i < 60; i++) {
    LabelStudio.init({
      config: `
<View>
  <Video name="video" value="$video" />
  <VideoRectangle name="box" toName="video" />
</View>`,
      data: { video: '/files/opossum_intro.webm' },
    });

    I.wait(i * i / 1000000);
  }
  I.dontSeeElementInDOM({ xpath: '//body/video[position()=2]' });
  I.dontSee('null');
}).config({ waitForAction: 0 });
