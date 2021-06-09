import { execSync, spawn } from 'child_process';
import fs from 'fs';
import mkdirp from 'mkdirp';
import fetch from 'node-fetch';
import os from 'os';
import path from 'path';
import rimraf from 'rimraf';

export type ServerControls = {
  hostname: string,
  shutdown: () => Promise<string>
}

const LS_ROOT = path.resolve(process.env.PWD!, '../..');
const TMP_DIR = path.join(LS_ROOT, "label_studio", "frontend", "tmp");
const CACHE_ROOT = path.join(TMP_DIR, "test");
const CACHE_FILE = "test.cache";

const prepareCache = () => {
  // Make sure the dir exists
  mkdirp.sync(CACHE_ROOT);

  // Make sure the file exists
  fs.writeFileSync(path.join(CACHE_ROOT, CACHE_FILE), "", { flag: "a", encoding: "utf-8" });
};

const readCache = (): Record<string, any> => {
  prepareCache();

  const cacheFile = fs.readFileSync(path.join(CACHE_ROOT, CACHE_FILE), { encoding: "utf-8" });

  return JSON.parse(cacheFile || "{}");
};

const writeCache = (
  key: string | number,
  value: Record<string, any> = {},
) => {
  const cache = readCache();
  const currentValue = cache[key] ?? {};

  Object.assign(cache, { [key]: { ...currentValue, ...value } });

  fs.writeFileSync(path.join(CACHE_ROOT, CACHE_FILE), JSON.stringify(cache), { encoding: "utf-8" });

  return cache;
};

const removeFromCache = (
  key: string | number,
) => {
  const cache = readCache();

  const newCache = Object.fromEntries(Object.entries(cache).filter(([cacheKey]) => {
    return cacheKey !== key.toString();
  }));

  fs.writeFileSync(path.join(CACHE_ROOT, CACHE_FILE), JSON.stringify(newCache), { encoding: "utf-8" });

  return newCache;
};

const findPort = () => {
  let port = 9191;

  const cache = readCache();
  const ports = Object.keys(cache).map(p => Number(p));

  if (ports.length) {
    port = Math.max(...ports) + 1;
  }

  writeCache(port);

  return port.toString();
};

const pingServer = (host: string, onReady: (running: boolean) => void) => {
  setTimeout(async () => {
    const url = `${host}/version`;

    try {
      const response = await fetch(url);

      if (response.ok) {
        onReady(true);
      } else {
        onReady(false);
      }
    } catch {
      pingServer(host, onReady);
    }
  }, 100);
};

export const cleanup = async () => {
  const cache = readCache();

  console.log(cache);

  Object
    .entries<any>(cache)
    .forEach(([port, {tmp, pid}]: [string, {tmp: string, pid: number}]) => {
      rimraf.sync(tmp);
      if (pid) execSync(`pkill -f "port ${port}"`);
    });

  fs.unlinkSync(path.join(CACHE_ROOT, CACHE_FILE));
};

export const runTestServer = async () => {
  const verbose = process.env.VERBOSE === 'true' || process.argv.includes('-v') || process.argv.includes('--verbose');
  const freePort = findPort();
  const SERVER_TMP = path.join(os.tmpdir(), `test-server-${freePort}`);

  writeCache(freePort, {tmp: SERVER_TMP});

  if (verbose) console.log(`\nBooting testing evrionment [${process.pid}]`);

  rimraf.sync(SERVER_TMP);
  mkdirp.sync(SERVER_TMP);

  const [host, port] = ["localhost", freePort];
  const FULL_HOSTNAME = `http://${host}:${port}`;
  const serverCmd = [
    `cd ${LS_ROOT}`,
    `source ${path.join(LS_ROOT, 'venv/htx/bin/activate')}`,
    `label-studio --no-browser --host http://${host} --port ${port} --data-dir ${SERVER_TMP} --username admin@heartex.com --password myCorrectPassword123`,
  ].join(' && ');

  const serverOptions: any = {
    shell: true,
  };

  if (verbose) {
    serverOptions.stdio = [null, process.stdout, null];
  }

  return new Promise<ServerControls>((resolve) => {
    const server = spawn(serverCmd, serverOptions);

    writeCache(freePort, {pid: server.pid});

    const serverControls: ServerControls = {
      hostname: FULL_HOSTNAME,
      shutdown: async () => {
        if (verbose) console.log("\nShutting down testing evrionment");
        rimraf.sync(SERVER_TMP);
        removeFromCache(freePort);
        return execSync(`pkill -f "data-dir ${SERVER_TMP}"`).toString();
      },
    };

    pingServer(FULL_HOSTNAME, (success) => {
      if (success) {
        resolve(serverControls);
      } else {
        serverControls.shutdown();
      }
    });

    process.on("SIGTERM", () => {
      if (verbose) console.log("\nExit [SIGTERM]");
      serverControls.shutdown();
    });

    process.on("SIGINT", () => {
      if (verbose) console.log("\nExit [SIGINT]");
      serverControls.shutdown();
    });
  });
};
