// setup.js
import fs from 'fs';
import mkdirp from 'mkdirp';
import os from 'os';
import path from 'path';
import puppeteer from 'puppeteer';
import { runTestServer } from './run_dev_server';

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup');

module.exports = async function () {
  const server = await runTestServer();
  const browser = await puppeteer.launch();

  // store the browser instance so we can teardown it later
  // this global is only available in the teardown but not in TestEnvironments
  Object.assign(global, {
    __BROWSER_GLOBAL__: browser,
    __SERVER_GLOBAL__: server,
  });

  // use the file system to expose the wsEndpoint for TestEnvironments
  mkdirp.sync(DIR);
  fs.writeFileSync(path.join(DIR, 'wsEndpoint'), browser.wsEndpoint());
};
