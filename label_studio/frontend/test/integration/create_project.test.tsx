import { runTestServer, Server } from "../setup/run_dev_server";

let server: Server;

beforeEach(async () => {
  server = await runTestServer();
});

afterEach(async () => {
  await server.shutdown();
});

describe("Minitmal", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });
});
