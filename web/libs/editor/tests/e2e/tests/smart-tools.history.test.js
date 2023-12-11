Feature('Smart tools history');

function paramsToAttrs(params) {
  return params && Object.entries(params).map(([name, value]) => {
    return `${name}="${value}"`;
  }).join(' ');
}

function createRectangleConfig(params = {}) {
  return `
<View>
  <Image name="img" value="$image"/>
  <Rectangle name="rectangle" toName="img" ${paramsToAttrs(params)} />
  <Labels name="tag" toName="img">
      <Label value="Header" background="red"/>
      <Label value="Pargagraph" background="orange"/>
      <Label value="List Item" background="blue"/>
  </Labels>
  <TextArea name="ocr" toName="img" perRegion="true" editable="true" displayMode="region-list"/>
</View>`;
}

const IMAGE = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Html_headers.png/640px-Html_headers.png';

function getRectangleSuggestions(reg, group) {
  const allSuggestions = [{
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': {
      'x': 0.9562500000000016,
      'y': 0.7415920969816383,
      'width': 35.05624999999999,
      'height': 6.711376902658406,
      'rotation': 0,
    },
    'id': 'Dx_aB91ISN',
    'from_name': 'label1',
    'to_name': 'img',
    'type': 'labels',
    'origin': 'prediction',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': {
      'x': 0.9562500000000016,
      'y': 0.7415920969816383,
      'width': 35.05624999999999,
      'height': 6.711376902658406,
      'rotation': 0,
      'text': ['The "H1" Header'],
    },
    'id': 'Dx_aB91ISN',
    'from_name': 'ocr',
    'to_name': 'img',
    'type': 'textarea',
    'origin': 'prediction',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': { 'x': 0.78125, 'y': 10.650887573964498, 'width': 98.28125, 'height': 10.453648915187378, 'rotation': 0 },
    'id': '61LzdjSgA7',
    'from_name': 'rectangle',
    'to_name': 'img',
    'type': 'rectangle',
    'origin': 'prediction',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': { 'x': 0.78125, 'y': 10.650887573964498, 'width': 98.28125, 'height': 10.453648915187378, 'rotation': 0 },
    'id': '61LzdjSgA7',
    'from_name': 'label1',
    'to_name': 'img',
    'type': 'labels',
    'origin': 'prediction',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': {
      'x': 0.78125,
      'y': 10.650887573964498,
      'width': 98.28125,
      'height': 10.453648915187378,
      'rotation': 0,
      'text': ['This is a paragraph contained within the "p" tag. This content repeats itself for demonstration purposes. This content repeats itsel for demonstration purposes. This content repeats itself for demonstration purposes. This content repeats itself for demonstration purposes.'],
    },
    'id': '61LzdjSgA7',
    'from_name': 'ocr',
    'to_name': 'img',
    'type': 'textarea',
    'origin': 'prediction',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': {
      'x': 0.78125,
      'y': 24.06311637080868,
      'width': 25.937500000000007,
      'height': 5.128205128205128,
      'rotation': 0,
    },
    'id': 'PqkSyiIR2U',
    'from_name': 'rectangle',
    'to_name': 'img',
    'type': 'rectangle',
    'origin': 'prediction',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': {
      'x': 0.78125,
      'y': 24.06311637080868,
      'width': 25.937500000000007,
      'height': 5.128205128205128,
      'rotation': 0,
    },
    'id': 'PqkSyiIR2U',
    'from_name': 'label1',
    'to_name': 'img',
    'type': 'labels',
    'origin': 'prediction',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': {
      'x': 0.78125,
      'y': 24.06311637080868,
      'width': 25.937500000000007,
      'height': 5.128205128205128,
      'rotation': 0,
      'text': ['The "H2" Header'],
    },
    'id': 'PqkSyiIR2U',
    'from_name': 'ocr',
    'to_name': 'img',
    'type': 'textarea',
    'origin': 'prediction',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': { 'x': 0.78125, 'y': 31.163708086785004, 'width': 60.9375, 'height': 4.930966469428008, 'rotation': 0 },
    'id': '2Goh8lkpid',
    'from_name': 'rectangle',
    'to_name': 'img',
    'type': 'rectangle',
    'origin': 'prediction',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': {
      'x': 0.78125,
      'y': 31.163708086785004,
      'width': 60.9375,
      'height': 4.930966469428008,
      'rotation': 0,
      'text': ['This paragraph, also contained within "p"tag, contains an unordered list:'],
    },
    'id': '2Goh8lkpid',
    'from_name': 'ocr',
    'to_name': 'img',
    'type': 'textarea',
    'origin': 'prediction',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': {
      'x': 3.750000000000001,
      'y': 38.85601577909269,
      'width': 32.96874999999999,
      'height': 2.5641025641025608,
      'rotation': 0,
    },
    'id': 'otJ6aU8x9B',
    'from_name': 'rectangle',
    'to_name': 'img',
    'type': 'rectangle',
    'origin': 'prediction-changed',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': {
      'x': 3.750000000000001,
      'y': 38.85601577909269,
      'width': 32.96874999999999,
      'height': 2.5641025641025608,
      'rotation': 0,
      'text': ['This is a list item in an unordered list'],
    },
    'id': 'otJ6aU8x9B',
    'from_name': 'ocr',
    'to_name': 'img',
    'type': 'textarea',
    'origin': 'prediction-changed',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': {
      'x': 3.7499999999999987,
      'y': 42.01183431952662,
      'width': 37.18749999999998,
      'height': 2.761341222879683,
      'rotation': 0,
    },
    'id': 'TnWXaMtEP0',
    'from_name': 'rectangle',
    'to_name': 'img',
    'type': 'rectangle',
    'origin': 'prediction-changed',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': {
      'x': 3.7499999999999987,
      'y': 42.01183431952662,
      'width': 37.18749999999998,
      'height': 2.761341222879683,
      'rotation': 0,
      'text': ['This is another list item in an unordered list'],
    },
    'id': 'TnWXaMtEP0',
    'from_name': 'ocr',
    'to_name': 'img',
    'type': 'textarea',
    'origin': 'prediction-changed',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': {
      'x': 3.7500000000000058,
      'y': 45.364891518737686,
      'width': 39.843749999999986,
      'height': 3.155818540433913,
      'rotation': 0,
    },
    'id': '8DhVECLljf',
    'from_name': 'rectangle',
    'to_name': 'img',
    'type': 'rectangle',
    'origin': 'manual',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': {
      'x': 3.7500000000000058,
      'y': 45.364891518737686,
      'width': 39.843749999999986,
      'height': 3.155818540433913,
      'rotation': 0,
      'text': ['This is yet another list item in an unordered list'],
    },
    'id': '8DhVECLljf',
    'from_name': 'ocr',
    'to_name': 'img',
    'type': 'textarea',
    'origin': 'manual',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': {
      'x': 0.78125,
      'y': 51.67652859960554,
      'width': 21.093749999999993,
      'height': 3.747534516765286,
      'rotation': 0,
    },
    'id': 'Dr2-ppHmQU',
    'from_name': 'rectangle',
    'to_name': 'img',
    'type': 'rectangle',
    'origin': 'manual',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': {
      'x': 0.78125,
      'y': 51.67652859960554,
      'width': 21.093749999999993,
      'height': 3.747534516765286,
      'rotation': 0,
      'text': ['The "H3" Header'],
    },
    'id': 'Dr2-ppHmQU',
    'from_name': 'ocr',
    'to_name': 'img',
    'type': 'textarea',
    'origin': 'manual',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': {
      'x': 0.7812499999999998,
      'y': 58.777120315581854,
      'width': 99.06249999999997,
      'height': 9.664694280078905,
      'rotation': 0,
    },
    'id': '3QeY6ZaJfC',
    'from_name': 'rectangle',
    'to_name': 'img',
    'type': 'rectangle',
    'origin': 'manual',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': {
      'x': 0.7812499999999998,
      'y': 58.777120315581854,
      'width': 99.06249999999997,
      'height': 9.664694280078905,
      'rotation': 0,
      'text': ['Another paragraph contained whithin the "p" tag. This content repeats itself for demonstration purposes. This content repeats itself for demonstration purposes.This content repeats itself for demonstration purposes.This content repeats itself for demonstration purposes.'],
    },
    'id': '3QeY6ZaJfC',
    'from_name': 'ocr',
    'to_name': 'img',
    'type': 'textarea',
    'origin': 'manual',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': { 'x': 0.625, 'y': 71.59763313609467, 'width': 17.65625, 'height': 4.142011834319527, 'rotation': 0 },
    'id': 'b_an6nG-s1',
    'from_name': 'rectangle',
    'to_name': 'img',
    'type': 'rectangle',
    'origin': 'manual',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': {
      'x': 0.625,
      'y': 71.59763313609467,
      'width': 17.65625,
      'height': 4.142011834319527,
      'rotation': 0,
      'text': ['The "H4" Header'],
    },
    'id': 'b_an6nG-s1',
    'from_name': 'ocr',
    'to_name': 'img',
    'type': 'textarea',
    'origin': 'manual',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': { 'x': 0.625, 'y': 78.30374753451676, 'width': 64.375, 'height': 4.536489151873767, 'rotation': 0 },
    'id': 'H58PCLk6in',
    'from_name': 'rectangle',
    'to_name': 'img',
    'type': 'rectangle',
    'origin': 'manual',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': {
      'x': 0.625,
      'y': 78.30374753451676,
      'width': 64.375,
      'height': 4.536489151873767,
      'rotation': 0,
      'text': ['Another paragraf contained within the "p" tag. This one\'s shorter than the rest.'],
    },
    'id': 'H58PCLk6in',
    'from_name': 'ocr',
    'to_name': 'img',
    'type': 'textarea',
    'origin': 'manual',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': {
      'x': 0.9375,
      'y': 85.00986193293886,
      'width': 14.531250000000004,
      'height': 4.142011834319527,
      'rotation': 0,
    },
    'id': 'LW3Hd45XGa',
    'from_name': 'rectangle',
    'to_name': 'img',
    'type': 'rectangle',
    'origin': 'manual',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': {
      'x': 0.9375,
      'y': 85.00986193293886,
      'width': 14.531250000000004,
      'height': 4.142011834319527,
      'rotation': 0,
      'text': ['The "H5" header'],
    },
    'id': 'LW3Hd45XGa',
    'from_name': 'ocr',
    'to_name': 'img',
    'type': 'textarea',
    'origin': 'manual',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': { 'x': 0.9375, 'y': 91.91321499013807, 'width': 40.46875, 'height': 4.339250493096647, 'rotation': 0 },
    'id': 'ZxltsrsvQl',
    'from_name': 'rectangle',
    'to_name': 'img',
    'type': 'rectangle',
    'origin': 'manual',
  }, {
    'original_width': 640,
    'original_height': 507,
    'image_rotation': 0,
    'value': {
      'x': 0.9375,
      'y': 91.91321499013807,
      'width': 40.46875,
      'height': 4.339250493096647,
      'rotation': 0,
      'text': ['A final paragraph. There\'s not much content here.'],
    },
    'id': 'ZxltsrsvQl',
    'from_name': 'ocr',
    'to_name': 'img',
    'type': 'textarea',
    'origin': 'manual',
  }];
  const annotation = window.labelStudio.store.annotationStore.selected;
  const ids = group.map(r => r.id);
  const results = annotation.serializeAnnotation().filter((res) => ids.includes(res.id));
  const suggestions = allSuggestions.filter(predictionResult => {
    const targetCenterX = predictionResult.value.x + predictionResult.value.width / 2;
    const targetCenterY = predictionResult.value.y + predictionResult.value.height / 2;
    const targetWidth = predictionResult.value.width;
    const targetHeight = predictionResult.value.height;

    return results.some(result => {
      const resultCenterX = result.value.x + result.value.width / 2;
      const resultCenterY = result.value.y + result.value.height / 2;
      const resultWidth = result.value.width;
      const resultHeight = result.value.height;

      return (Math.abs(resultCenterX - targetCenterX) * 2 < (resultWidth + targetWidth)) &&
        (Math.abs(resultCenterY - targetCenterY) * 2 < (resultHeight + targetHeight));
    });
  });

  window.labelStudio.store.loadSuggestions(new Promise((resolve) => resolve(suggestions)), x => x);
}

Scenario('Undo regions auto-annotated from predictions', async function({ I, LabelStudio, AtImageView, AtSidebar }) {
  I.amOnPage('/');
  LabelStudio.init({
    config: createRectangleConfig({
      smartonly: true,
    }),
    data: {
      image: IMAGE,
    },
    additionalInterfaces: [
      'auto-annotation',
    ],
    events: {
      regionFinishedDrawing: getRectangleSuggestions,
    },
    params: {
      forceAutoAnnotation: true,
      forceAutoAcceptSuggestions: true,
    },
  });
  LabelStudio.setFeatureFlags({
    fflag_fix_front_dev_1284_auto_detect_undo_281022_short: true,
  });
  AtImageView.waitForImage();
  AtSidebar.seeRegions(0);
  await AtImageView.lookForStage();
  I.say('Select magic tool');
  I.pressKey('M');
  I.seeElement('[disabled][aria-label="Undo"]');
  I.say('Draw region over 5 potential suggestion area');
  AtImageView.drawByDrag(19,192,140,150);
  I.say('Get that suggestions as result instead of drawn region');
  AtSidebar.seeRegions(5);
  I.seeElement(':not([disabled])[aria-label="Undo"]');
  I.seeElement('[disabled][aria-label="Redo"]');
  I.say('Go back through history');
  I.pressKey(['ctrl', 'z']);
  I.say('Should see nothing');
  AtSidebar.seeRegions(0);
  I.seeElement('[disabled][aria-label="Undo"]');
  I.seeElement(':not([disabled])[aria-label="Redo"]');
  I.say('Go forward through history');
  I.pressKey(['ctrl','shift', 'z']);
  I.say('Regions must be restored');
  AtSidebar.seeRegions(5);
  I.seeElement(':not([disabled])[aria-label="Undo"]');
  I.seeElement('[disabled][aria-label="Redo"]');
});

Scenario('Undo if there are no regions auto-annotated from predictions', async function({ I, LabelStudio, AtImageView, AtSidebar }) {
  I.amOnPage('/');
  LabelStudio.init({
    config: createRectangleConfig({
      smartonly: true,
    }),
    data: {
      image: IMAGE,
    },
    additionalInterfaces: [
      'auto-annotation',
    ],
    events: {
      regionFinishedDrawing: getRectangleSuggestions,
    },
    params: {
      forceAutoAnnotation: true,
      forceAutoAcceptSuggestions: true,
    },
  });
  LabelStudio.setFeatureFlags({
    fflag_fix_front_dev_1284_auto_detect_undo_281022_short: true,
  });
  AtImageView.waitForImage();
  AtSidebar.seeRegions(0);
  await AtImageView.lookForStage();
  I.say('Select magic tool');
  I.pressKey('M');
  I.seeElement('[disabled][aria-label="Undo"]');
  I.say('Draw region over area without potential suggestions');
  AtImageView.drawByDrag(600,200,7,7);
  I.say('Get an empty list of regions as the result instead of drawn region');
  AtSidebar.seeRegions(0);
  I.seeElement(':not([disabled])[aria-label="Undo"]');
  I.seeElement('[disabled][aria-label="Redo"]');
  I.say('Go back through history');
  I.pressKey(['ctrl', 'z']);
  I.say('Should see nothing');
  AtSidebar.seeRegions(0);
  I.seeElement('[disabled][aria-label="Undo"]');
  I.seeElement(':not([disabled])[aria-label="Redo"]');
  I.say('Go forward through history');
  I.pressKey(['ctrl','shift', 'z']);
  I.say('And see nothing again');
  AtSidebar.seeRegions(0);
  I.seeElement(':not([disabled])[aria-label="Undo"]');
  I.seeElement('[disabled][aria-label="Redo"]');

  I.say('Go back through history');
  I.pressKey(['ctrl', 'z']);
  I.say('Should see nothing');
  AtSidebar.seeRegions(0);
  I.seeElement('[disabled][aria-label="Undo"]');
  I.seeElement(':not([disabled])[aria-label="Redo"]');
  I.say('Draw region over area without potential suggestions');
  AtImageView.drawByDrag(600,200,7,7);
  I.say('Get an empty list of regions as the result instead of drawn region');
  AtSidebar.seeRegions(0);

  I.say('There should be one history step');
  I.seeElement(':not([disabled])[aria-label="Undo"]');
  I.seeElement('[disabled][aria-label="Redo"]');
});
