import { bootTestServer } from "../helpers/boot_test_server";

const server = bootTestServer();

describe("User authentication", () => {
  it("should visit LS and see the title", async () => {
    await page.goto(server.hostname);

    expect(await page.title()).toBe("Label Studio");
  });
});
