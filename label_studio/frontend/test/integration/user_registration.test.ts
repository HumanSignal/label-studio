import { bootTestServer } from "../helpers/boot_test_server";

const server = bootTestServer();

describe("User authentication", () => {
  it("should visit LS and see the title", async () => {
    await page.goto(`${server.hostname}/user/signup`);

    expect(await page.title()).toBe("Label Studio");

    await expect(page).toFillForm('form#signup-form', {
      email: 'test@heartex.com',
      password: '12345678',
    });

    await page.click('button[aria-label="Create Account"]');

    await page.waitForNavigation({ waitUntil: "domcontentloaded" });

    expect(page.url()).toBe(`${server.hostname}/projects`);
  });
});
