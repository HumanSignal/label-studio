import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import fs from "fs";

const readFile = (path) => {
  return new Promise((resolve) => {
    fs.readFile(path, (err, file) => {
      if (err) return resolve(err);
      resolve({ path, file });
    });
  });
};

const runComparison = async (options) => {
  const files = await Promise.all([readFile(options.initialScreenshot), readFile(options.currentScreenshot)]).then(
    (files) => {
      return files.map((f) => {
        return {
          ...f,
          file: PNG.sync.read(f.file),
        };
      });
    },
  );

  const img1 = files.find(({ path }) => path.match("-orig")).file;
  const img2 = files.find(({ path }) => path.match("-comp")).file;
  const { width, height } = img1;

  if (img1.width !== img2.width || img1.height !== img2.height) {
    throw new Error(
      `Image sizes do not match: orig=${img1.width}x${img1.height} vs comp=${img2.width}x${img2.height}. ` +
        "Capture and compare only after the subject element has a stable layout size.",
    );
  }

  const diff = new PNG({ width, height });

  const totalPixels = width * height;

  const changedPixels = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, {
    threshold: options.threshold,
  });
  const changeRatio = changedPixels / totalPixels;

  // Add debug logging for CI troubleshooting
  console.log(
    `Screenshot comparison - Changed pixels: ${changedPixels}/${totalPixels} (${(changeRatio * 100).toFixed(2)}%), Threshold: ${options.threshold}, Operation: ${options.compare}`,
  );

  switch (options.compare) {
    case "shouldChange":
      return changeRatio > options.threshold;
    case "shouldNotChange":
      return changeRatio <= options.threshold;
  }
  return false;
};

export const compareScreenshots = (options) => {
  return runComparison(options);
};
