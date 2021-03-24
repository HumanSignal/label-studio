import { spawn } from 'child_process';
import mkdirp from 'mkdirp';
import os from 'os';
import path from 'path';
import rimraf from 'rimraf';

const LS_ROOT = path.resolve(process.env.PWD!, '../..');
const LOCAL_HOSTNAME = "localhost:9191";
const SERVER_TMP = path.join(os.tmpdir(), 'test-server');

export type Server = {
  hostname: string,
  shutdown: () => Promise<boolean>,
}

export const runTestServer = async () => {
  return new Promise<Server>((resolve) => {
    let isRunning = false;

    mkdirp.sync(SERVER_TMP);

    const RUNNING_MESSAGE = `Starting development server at http://${LOCAL_HOSTNAME}/`;
    const [host, port] = LOCAL_HOSTNAME.split(":");
    const cmd = `label-studio --host ${host} --port ${port} --data-dir ${SERVER_TMP}`;

    const server = spawn(`cd ${LS_ROOT} && source ${path.join(LS_ROOT, 'venv/htx/bin/activate')} && ${cmd}`, {
      shell: true,
    });

    const handler = (data: any) => {
      console.log(data);
      isRunning = data.toString().match(new RegExp(`${RUNNING_MESSAGE}`));

      if (isRunning) {
        resolve({
          hostname: `http://${LOCAL_HOSTNAME}`,
          shutdown: async() => {
            rimraf.sync(SERVER_TMP);
            return server.emit('exit');
          },
        });

        server.stdout.off('data', handler);
      }
    };

    server.stdout.on("data", handler);

    server.on("error", (err) => console.log(err));
  });
};
