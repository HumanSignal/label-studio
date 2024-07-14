import cypressCoverageTask from "@cypress/code-coverage/task.js";
import lockfile from "proper-lockfile";
import fs from "fs";
import path from "path";

const LOCK_PATH = path.resolve(process.cwd(), "tmp");
const LOCK_WAITING_TIMEOUT = 100;

async function waitTime(timeout) {
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}

async function beginSyncedPart(key) {
  let release;

  while (!release) {
    try {
      release = await lockfile.lock(path.resolve(LOCK_PATH, key), { realpath: false });
    } catch (err) {
      await waitTime(LOCK_WAITING_TIMEOUT);
    }
  }
  return release;
}

export const coverageParallel = (on, config) => {
  try {
    fs.rmSync(LOCK_PATH, { recursive: true, force: true });
    fs.mkdirSync(LOCK_PATH);
  } catch (err) {
    console.log(err);
  }

  cypressCoverageTask((_, tasks) => {
    // we use our own locking here to prevent a race condition with cypress-coverage and
    // cypress-parallel
    const paralleledTasks = {
      ...tasks,
      combineCoverage: async (sentCoverage) => {
        const endSyncedPart = await beginSyncedPart("cypressCombineCoverage");
        const ret = await tasks.combineCoverage(sentCoverage);

        await endSyncedPart();
        return ret;
      },
      coverageReport: async () => {
        const endSyncedPart = await beginSyncedPart("cypressCoverageReport");
        const ret = await tasks.coverageReport();

        await endSyncedPart();
        return ret;
      },
    };

    on("task", paralleledTasks);
  }, config);
  return config;
};
