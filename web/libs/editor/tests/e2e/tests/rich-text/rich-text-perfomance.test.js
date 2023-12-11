const assert = require('assert');
const { createRandomIntWithSeed } = require('../helpers');

Feature('Richtext perfomance');

Before(({ LabelStudio }) => {
  LabelStudio.setFeatureFlags({
    ff_front_1170_outliner_030222_short: true,
    fflag_feat_front_lsdv_4620_richtext_opimization_060423_short: true,
  });
});

// Generate text and results generator
const SYMBOLS = 'abcdefghijklmnopqrstuvwxyz';
const NEWLINE = '/n';
const SPACE = ' ';
const MIN_WORD_SIZE = 2;
const MAX_WORD_SIZE = 23;

function generateAnnotationParams(sybolsNum, regionsNum, seed = 42) {
  const genWord = (len) => {
    const start = length % SYMBOLS.length;
    const end = start + len;
    const s = SYMBOLS.repeat(Math.ceil(end / SYMBOLS.length));

    return s.substring(start, end);
  };
  const words = [];
  const randomInt = createRandomIntWithSeed(seed);
  let length = 0;
  let paragraphWords = randomInt(0, 150);

  let currentWordLength;

  while ((currentWordLength = Math.min(randomInt(MIN_WORD_SIZE, MAX_WORD_SIZE), sybolsNum - length)) > 0) {
    words.push(genWord(currentWordLength));
    length += currentWordLength;
    if (--paragraphWords < 1) {
      words.push(NEWLINE);
      paragraphWords = randomInt(0, 50);
    } else {
      words.push(SPACE);
    }
  }
  const text = words.join('');

  return {
    config: `<View>
    <Labels name="label" toName="text">
        <Label value="Label" background="green"/>
    </Labels>
    <Text name="text" value="$text" />
</View>`,
    data: {
      text,
    },
    annotations: [
      {
        id: 'test',
        result: Array.from({ length: regionsNum }, (v, idx) => {
          const startOffset = randomInt(0, text.length - 2);
          const endOffset = startOffset + Math.min(randomInt(1, 50), text.length - startOffset);

          return {
            id: `1_${idx}`,
            from_name: 'label',
            to_name: 'text',
            type: 'labels',
            value: { start: startOffset, end: endOffset, labels: ['Label'] },
          };
        }),
      },
    ],
  };
}

// Feel free to make this test skipped in case of needness
Scenario('Rich text initialization in hightload conditions', async ({ I, LabelStudio, AtOutliner }) => {
  const SYMBOLS_NUM = 100000;
  const REGIONS_NUM = 2000;

  // Generate text and results to reach 100K symbols and 2К labels
  const params = generateAnnotationParams(SYMBOLS_NUM, REGIONS_NUM);

  I.amOnPage('/');
  I.executeScript(async () => {
    new Promise(resolve => {
      const watchLabelStudioReady = () => {
        const isReady = window.document.querySelector('.lsf-richtext');

        if (isReady) {
          window._startTime = Date.now();
          resolve(true);
        } else {
          setTimeout(watchLabelStudioReady, 100);
        }
      };

      watchLabelStudioReady();
    }).then(() => {
      new Promise(resolve => {
        const watchObjectsReady = () => {
          const isReady = window.Htx && window.Htx.annotationStore.selected.objects.every(object => object.isReady);

          if (isReady) {
            window._loadedTime = Date.now();
            resolve(true);
          } else {
            setTimeout(watchObjectsReady, 100);
          }
        };

        watchObjectsReady();
      });
    });
  });
  LabelStudio.init(params);
  await LabelStudio.waitForObjectsReady();
  const initDuration = await I.executeScript(() => {
    return window._loadedTime - window._startTime;
  });

  I.say(`An annotation initialization has taken ${initDuration / 1000}s`);

  // Actually it could take 3.5-6s but "it depends..."
  assert(initDuration < 10000, `Annotation with 2K regions should be ready to interaction in less than 10s. Right now it's ${initDuration / 1000}s`);
});
