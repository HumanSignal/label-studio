import { bootTestServer } from "../helpers/boot_test_server";

const server = bootTestServer();

describe("User authentication", () => {
  it("Should register and log in", async () => {
    await page.goto(`${server.hostname}/user/signup`);

    expect(await page.title()).toBe("Label Studio");

    await expect(page).toFillForm('form#signup-form', {
      email: 'test@heartex.com',
      password: '12345678',
    });

    await expect(page).toClick('button', {
      text: "Create Account",
    });

    await page.waitForNavigation({ timeout: 3000 });

    expect(page.url()).toBe(`${server.hostname}/projects/`);
  });
});
