export const disableChromeGPU = (on) => {
  on("before:browser:launch", (browser = {}, launchOptions) => {
    if (browser.name === "chrome") {
      launchOptions.args.push("--disable-gpu");
    }

    return launchOptions;
  });
};
