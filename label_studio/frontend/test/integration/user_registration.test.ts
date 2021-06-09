import { Page } from "puppeteer";
import { bootTestServer } from "../helpers/boot_test_server";

const server = bootTestServer();

const gotoSignUp = async (page: Page) => await page.goto(`${server.hostname}/user/signup`);

const gotoLogIn = async (page: Page) => await page.goto(`${server.hostname}/user/login`);

const submitForm = async (page: Page, form: string, fields: Record<string, any>, button: string) => {
  await expect(page).toFillForm(form, fields);

  await expect(page).toClick('button', { text: button });

  await page.waitForNavigation({ timeout: 3000 });
};

describe("User authentication", () => {
  it("Should register and log in", async () => {
    await gotoSignUp(page);

    expect(await page.title()).toBe("Label Studio");

    await submitForm(page, 'form#signup-form', {
      email: 'test@heartex.com',
      password: '12345678',
    }, "Create Account");

    expect(page.url()).toBe(`${server.hostname}/projects/`);
  });

  it("Should fail sign up with invalid credentials", async () => {
    await gotoSignUp(page);

    expect(await page.title()).toBe("Label Studio");

    // Test email format
    await submitForm(page, 'form#signup-form', {
      email: 'blahblahblah',
      password: '12345678',
    }, "Create Account");

    await expect(page).toMatch("Enter a valid email address.");

    // Test password format
    await submitForm(page, 'form#signup-form', {
      email: 'text@heartex.com',
      password: '123',
    }, "Create Account");

    await expect(page).toMatch("Please enter a password 8-12 characters in length");
  });

  it("Should log in with default credentials", async () => {
    await gotoLogIn(page);

    expect(await page.title()).toBe("Label Studio");

    await submitForm(page, 'form#login-form', {
      email: 'admin@heartex.com',
      password: 'myCorrectPassword123',
    }, "Log in");

    expect(page.url()).toBe(`${server.hostname}/projects/`);
  });
});
