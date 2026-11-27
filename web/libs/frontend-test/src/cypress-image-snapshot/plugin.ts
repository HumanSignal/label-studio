import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import fs from "fs";
import path from "path";

type MatchImageSnapshotOptions = {
  screenshotPath: string;
  snapshotsDir: string;
  snapshotName: string;
  threshold?: number;
  failureThresholdType?: "pixel" | "percent";
  updateSnapshots?: boolean;
  failOnSnapshotDiff?: boolean;
};

export function addMatchImageSnapshotPlugin(on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) {
  on("task", {
    matchImageSnapshotTask(options: MatchImageSnapshotOptions) {
      const {
        screenshotPath,
        snapshotsDir,
        snapshotName,
        threshold = 0.01,
        failureThresholdType = "percent",
        updateSnapshots = false,
      } = options;

      const baselinePath = path.join(snapshotsDir, `${snapshotName}.png`);
      const diffDir = path.join(snapshotsDir, "__diff_output__");
      const diffPath = path.join(diffDir, `${snapshotName}.diff.png`);

      if (!fs.existsSync(snapshotsDir)) {
        fs.mkdirSync(snapshotsDir, { recursive: true });
      }

      if (!fs.existsSync(baselinePath) || updateSnapshots) {
        fs.copyFileSync(screenshotPath, baselinePath);
        console.log(`Updated or created baseline snapshot at: ${baselinePath}`);
        return {
          pass: true,
          message: `Image snapshot successfully saved to ${baselinePath}`,
        };
      }

      const readImage = (imgFile: string) => {
        return new Promise<PNG>((resolve, reject) => {
          const stream = fs.createReadStream(imgFile);
          stream.on("error", (err) => reject(err));
          stream
            .pipe(new PNG({ filterType: 4 }))
            .on("parsed", function () {
              resolve(this as PNG);
            })
            .on("error", (err) => reject(err));
        });
      };

      return Promise.all([readImage(screenshotPath), readImage(baselinePath)]).then(([currentImg, baselineImg]) => {
        const width = Math.max(currentImg.width, baselineImg.width);
        const height = Math.max(currentImg.height, baselineImg.height);

        const padImage = (img: PNG) => {
          if (img.width === width && img.height === height) return img;
          const padded = new PNG({ width, height });
          img.bitblt(padded, 0, 0, img.width, img.height, 0, 0);
          return padded;
        };

        const currentPadded = padImage(currentImg);
        const baselinePadded = padImage(baselineImg);
        const diffImg = new PNG({ width, height });

        const numDiffPixels = pixelmatch(baselinePadded.data, currentPadded.data, diffImg.data, width, height, {
          threshold: failureThresholdType === "percent" ? threshold : 0.1,
        });

        const totalPixels = width * height;
        const diffRatio = numDiffPixels / totalPixels;

        const isFailure = failureThresholdType === "percent" ? diffRatio > threshold : numDiffPixels > threshold;

        if (isFailure) {
          if (!fs.existsSync(diffDir)) {
            fs.mkdirSync(diffDir, { recursive: true });
          }
          diffImg.pack().pipe(fs.createWriteStream(diffPath));

          return {
            pass: false,
            message: `Snapshot mismatch: ${numDiffPixels} pixels differ (${(diffRatio * 100).toFixed(2)}%). Diff saved at: ${diffPath}`,
            diffRatio,
            numDiffPixels,
            diffPath,
          };
        }

        return { pass: true, diffRatio, numDiffPixels };
      });
    },
  });

  return config;
}
