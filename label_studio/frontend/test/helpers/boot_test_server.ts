import { runTestServer, ServerControls } from "../setup/run_dev_server";

export const bootTestServer = () => {
  let server: ServerControls;

  beforeEach(async () => {
    server = await runTestServer();
  });

  afterEach(async () => {
    await server.shutdown();
  });

  return {
    get hostname() {
      return server.hostname;
    },
  };
};
