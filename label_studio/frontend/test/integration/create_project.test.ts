import { bootTestServer } from "../helpers/boot_test_server";


describe("Project creation", () => {
  const server = bootTestServer();

  it("should visit LS and see the title", async () => {
    await page.goto(server.hostname);

    expect(await page.title()).toBe("Label Studio");
  });
});
