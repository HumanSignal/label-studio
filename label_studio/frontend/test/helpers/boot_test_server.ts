import { runTestServer, ServerControls } from "../setup/run_dev_server";

export const bootTestServer = () => {
  let server: ServerControls;

  beforeEach(async () => {
    console.log("Starting LS server insance");
    server = await runTestServer();
    console.log(`Server is running [${server.hostname}]`);
    return true;
  }, 20000);

  afterEach(async () => {
    await server.shutdown();
    console.log("Server's down");
    return true;
  }, 20000);

  return {
    get hostname() {
      return server.hostname;
    },
  };
};
