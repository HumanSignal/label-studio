// teardown.js
import os from 'os';
import path from 'path';
import rimraf from 'rimraf';

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup');

module.exports = async function () {
  // close the browser instance
  const {
    __BROWSER_GLOBAL__: browser,
    __SERVER_GLOBAL__: server,
  } = global as any;

  await browser.close();
  await server.shutdown();

  // clean-up the wsEndpoint file
  rimraf.sync(DIR);
};
