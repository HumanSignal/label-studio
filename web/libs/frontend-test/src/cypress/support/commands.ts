import Loggable = Cypress.Loggable;
import Timeoutable = Cypress.Timeoutable;
import Thresholdable = Cypress.Thresholdable;
import CompareScreenshotOptions = Cypress.CompareScreenshotOptions;

// cypress-image-snapshot is incompatible with Cypress 15 — stub the command as a no-op until a replacement is adopted
Cypress.Commands.add("matchImageSnapshot", { prevSubject: ["optional", "element", "window", "document"] }, () => {
  cy.log("⚠️ matchImageSnapshot is disabled (cypress-image-snapshot removed for Cypress 15 compatibility)");
});

const Screenshots = new Map<string, string>();

// Clear Screenshots Map before each test to prevent conflicts between tests
beforeEach(() => {
  Screenshots.clear();
});

const getName = (suffix: string) => {
  const spec = Cypress.spec.name;

  return `${spec.replace(/.([jt]s)/, "")}-${suffix}`.toLowerCase();
};

Cypress.Commands.add(
  "captureScreenshot",
  {
    prevSubject: ["element"],
  },
  (subject, name, screenshotCaptureOptions: Partial<Loggable & Timeoutable & CompareScreenshotOptions> = {}) => {
    const { withHidden = [], ...screenshotOptions } = screenshotCaptureOptions;
    const log = Cypress.log({
      $el: subject,
      name: "captureScreenshot",
      displayName: "captureScreenshot",
      type: "parent",
      autoEnd: false,
    });

    const screenshotName = getName(name);

    if (Screenshots.has(screenshotName)) {
      throw new Error("Screenshot already taken. Did you forget to call `compareScreenshot`?");
    }

    const obj = cy.wrap(subject, { log: false });

    obj.scrollIntoView({ log: false });

    for (const hiddenSelector of withHidden) {
      cy.get(hiddenSelector).invoke("css", "visibility", "hidden");
    }

    // Add a small delay before taking capture screenshot
    cy.wait(100);

    obj.screenshot(
      `${screenshotName}-orig`,
      Object.assign({ log: false }, screenshotOptions, {
        onAfterScreenshot(_el, screenshot) {
          screenshotOptions.onAfterScreenshot?.(_el, screenshot);
          Screenshots.set(screenshotName, screenshot.path);
        },
      }),
    );
    for (const hiddenSelector of withHidden) {
      cy.get(hiddenSelector).invoke("css", "visibility", "");
    }
    log.end();
    return obj;
  },
);

Cypress.Commands.add(
  "compareScreenshot",
  {
    prevSubject: ["element"],
  },
  (
    subject,
    name,
    compare,
    screenshotCompareOptions: Partial<Loggable & Timeoutable & CompareScreenshotOptions & Thresholdable> = {},
  ) => {
    const { threshold = 0.1, withHidden = [], ...screenshotOptions } = screenshotCompareOptions;
    const screenshotName = getName(name);
    const log = Cypress.log({
      $el: subject,
      name: "compareScreenshot",
      message: "Comparing screenshots",
      autoEnd: false,
    });

    if (!Screenshots.has(screenshotName)) {
      throw new Error("Screenshot not found. Did you forget to capture it?");
    }

    const obj = cy.wrap(subject.get(0), { log: false });
    const options = {
      initialScreenshot: "",
      currentScreenshot: "",
      threshold,
      compare,
    };

    obj.scrollIntoView({ log: false });
    for (const hiddenSelector of withHidden) {
      cy.get(hiddenSelector).invoke("css", "visibility", "hidden");
    }

    // Add a small delay before taking comparison screenshot
    cy.wait(100);

    obj.screenshot(
      `${screenshotName}-comp`,
      Object.assign({ log: false }, screenshotOptions, {
        onAfterScreenshot(_el, currentScreenshot) {
          screenshotOptions.onAfterScreenshot?.(_el, currentScreenshot);
          options.initialScreenshot = Screenshots.get(screenshotName);
          options.currentScreenshot = currentScreenshot.path;
        },
      }),
    );
    for (const hiddenSelector of withHidden) {
      cy.get(hiddenSelector).invoke("css", "visibility", "");
    }

    cy.task("compareScreenshots", options, { log: false }).then((result) => {
      if (!result) {
        const error = new Error(
          `Screenshot comparison failed: ${compare} - expected ${compare === "shouldChange" ? "changes" : "no changes"} but got the opposite. Check that visual states are properly rendered in your test environment.`,
        );

        log.error(error);
        throw error;
      }
      Screenshots.delete(screenshotName);
    });

    log.end();
    return obj;
  },
);

// CPU Throttling Commands
Cypress.Commands.add("throttleCPU", (rate: number) => {
  if (rate < 1) {
    throw new Error("CPU throttling rate must be >= 1");
  }

  return cy
    .wrap(
      Cypress.automation("remote:debugger:protocol", {
        command: "Emulation.setCPUThrottlingRate",
        params: { rate },
      }),
    )
    .then(() => {
      cy.log(`CPU throttling set to ${rate}x slower`);
    });
});

Cypress.Commands.add("waitForFrames", (frameCount = 1) => {
  return cy.window().then((win) => {
    return new Promise<void>((resolve) => {
      let framesElapsed = 0;

      function onFrame() {
        if (framesElapsed >= frameCount) {
          resolve();
        } else {
          framesElapsed += 1;
          win.requestAnimationFrame(onFrame);
        }
      }

      onFrame();
    });
  });
});

Cypress.Commands.add("resetCPU", () => {
  return cy.throttleCPU(1).then(() => {
    cy.log("CPU throttling reset to normal");
  });
});

// Network Throttling Commands
Cypress.Commands.add("throttleNetwork", (downloadThroughput: number, uploadThroughput: number, latency = 0) => {
  return cy
    .wrap(
      Cypress.automation("remote:debugger:protocol", {
        command: "Network.emulateNetworkConditions",
        params: {
          offline: false,
          downloadThroughput, // bytes per second
          uploadThroughput, // bytes per second
          latency, // milliseconds
        },
      }),
    )
    .then(() => {
      cy.log(
        `Network throttling set: ${Math.round(downloadThroughput / 1024)}KB/s down, ${Math.round(uploadThroughput / 1024)}KB/s up, ${latency}ms latency`,
      );
    });
});

Cypress.Commands.add("resetNetwork", () => {
  return cy
    .wrap(
      Cypress.automation("remote:debugger:protocol", {
        command: "Network.emulateNetworkConditions",
        params: {
          offline: false,
          downloadThroughput: -1, // -1 означает отключить throttling
          uploadThroughput: -1,
          latency: 0,
        },
      }),
    )
    .then(() => {
      cy.log("Network throttling reset to normal");
    });
});

// Preset network conditions
Cypress.Commands.add("setSlow3GNetwork", () => {
  // Slow 3G: ~50KB/s down, ~50KB/s up, 400ms latency
  return cy.throttleNetwork(50 * 1024, 50 * 1024, 400).then(() => {
    cy.log("Network set to Slow 3G");
  });
});

Cypress.Commands.add("setFast3GNetwork", () => {
  // Fast 3G: ~1.5MB/s down, ~750KB/s up, 150ms latency
  return cy.throttleNetwork(1.5 * 1024 * 1024, 750 * 1024, 150).then(() => {
    cy.log("Network set to Fast 3G");
  });
});

Cypress.Commands.add("set4GNetwork", () => {
  // 4G: ~4MB/s down, ~3MB/s up, 20ms latency
  return cy.throttleNetwork(4 * 1024 * 1024, 3 * 1024 * 1024, 20).then(() => {
    cy.log("Network set to 4G");
  });
});
