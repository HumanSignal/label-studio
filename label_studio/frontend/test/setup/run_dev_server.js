const  { spawn, exec } = require('child_process');
const  mkdirp = require('mkdirp');
const  os = require('os');
const  path = require('path');
const  rimraf = require('rimraf');
const readline = require('readline');

const LS_ROOT = path.resolve(process.env.PWD, '../..');
const LOCAL_HOSTNAME = "localhost:9191";
const SERVER_TMP = path.join(os.tmpdir(), 'test-server');

const runTestServer = async () => {
  return new Promise((resolve) => {
    console.log("\nBooting testing evrionment\n");
    let isRunning = false;

    mkdirp.sync(SERVER_TMP);

    const RUNNING_MESSAGE = `Starting development server at http://${LOCAL_HOSTNAME}/`;
    const [host, port] = LOCAL_HOSTNAME.split(":");
    const cmd = `label-studio --no-browser --host http://${host} --port ${port} --data-dir ${SERVER_TMP}`;

    const server = spawn(`cd ${LS_ROOT} && source ${path.join(LS_ROOT, 'venv/htx/bin/activate')} && ${cmd}`, {
      shell: true,
      detached: true,
      stdio: ["ipc"],
    });

    server.stdout.setEncoding('ascii');

    console.log("Connecting to child process...");

    const reader = readline.createInterface({ input: server.stdout });

    const serverControls = {
      hostname: `http://${LOCAL_HOSTNAME}`,
      shutdown: async() => {
        console.log("\nShutting down testing evrionment\n");
        rimraf.sync(SERVER_TMP);
        return server.emit('exit');
      },
    };

    const handler = (line) => {
      console.log(`MESSAGE: ${line}`);
      isRunning = line.toString().match(new RegExp(`${RUNNING_MESSAGE}`));

      if (isRunning) {
        resolve(serverControls);

        reader.off('data', handler);
      }
    };

    reader.on("line", handler);

    server.on("error", (err) => console.log(err));

    server.unref();

    process.on("SIGTERM", () => {
      console.log("Exit [SIGTERM]");
      serverControls.shutdown();
    });

    process.on("SIGINT", () => {
      console.log("Exit [SIGINT]");
      serverControls.shutdown();
    });
  });
};

module.exports = runTestServer;

runTestServer().then((server) => {
  console.log(server);
});
