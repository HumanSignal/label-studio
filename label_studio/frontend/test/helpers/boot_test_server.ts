import { runTestServer, ServerControls } from "../setup/test_server";

export const bootTestServer = () => {
  let server: ServerControls;

  beforeEach(async () => {
    server = await runTestServer();
    return true;
  }, 20000);

  afterEach(async () => {
    await server.shutdown();
    return true;
  }, 20000);

  return {
    get hostname() {
      return server.hostname;
    },
  };
};
