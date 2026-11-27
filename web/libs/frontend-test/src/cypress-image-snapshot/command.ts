export function addMatchImageSnapshotCommand(defaultOptions: any = {}) {
  Cypress.Commands.add(
    "matchImageSnapshot",
    { prevSubject: ["optional", "element", "window", "document"] },
    (subject: any, nameOrOptions?: string | any, commandOptions?: any) => {
      let name: string | undefined;
      let options: any = { ...defaultOptions };

      // Parse arguments: (name, options) | (options) | (name)
      if (typeof nameOrOptions === "string") {
        name = nameOrOptions;
        if (commandOptions) {
          options = { ...options, ...commandOptions };
        }
      } else if (typeof nameOrOptions === "object") {
        options = { ...options, ...nameOrOptions };
      }

      if (!name) {
        name = Cypress.currentTest.title.replace(/[\W_]+/g, "-").toLowerCase();
      }

      const threshold = options.failureThreshold !== undefined ? options.failureThreshold : 0.01;
      const failureThresholdType = options.failureThresholdType || "percent";
      const e2eSpecDir = options.e2eSpecDir || "cypress/e2e/";

      const updateSnapshots = Cypress.env("updateSnapshots") || false;
      const failOnSnapshotDiff = Cypress.env("failOnSnapshotDiff") !== false;

      const projectRoot = Cypress.config("projectRoot");
      const specName = Cypress.spec.name.replace(new RegExp(`^${e2eSpecDir}`), "");

      const customSnapshotsDir = options.customSnapshotsDir;
      const snapshotsDir = customSnapshotsDir
        ? `${projectRoot}/${customSnapshotsDir}`
        : `${projectRoot}/cypress/snapshots/${specName.replace(/\.[jt]sx?$/, "")}`;

      const tempName = `${name}-temp`;

      let screenshotPath = "";

      const screenshotOptions = {
        log: false,
        onAfterScreenshot: (_el: any, props: any) => {
          screenshotPath = props.path;
        },
      };

      const takeScreenshot = subject
        ? cy.wrap(subject, { log: false }).scrollIntoView({ log: false }).screenshot(tempName, screenshotOptions)
        : cy.screenshot(tempName, screenshotOptions);

      return takeScreenshot.then(() => {
        if (!screenshotPath) {
          throw new Error("Screenshot path not resolved. Make sure screenshots are enabled.");
        }

        return cy
          .task(
            "matchImageSnapshotTask",
            {
              screenshotPath,
              snapshotsDir,
              snapshotName: name,
              threshold,
              failureThresholdType,
              updateSnapshots,
            },
            { log: false },
          )
          .then((result: any) => {
            if (!result.pass) {
              if (failOnSnapshotDiff) {
                const err = new Error(result.message);
                err.name = "SnapshotMismatchError";
                throw err;
              }
              cy.log(`⚠️ Snapshot mismatch: ${result.message}`);
            }
            return cy.wrap(subject || Cypress.$("body"), { log: false }) as Cypress.Chainable<JQuery<Element>>;
          });
      });
    },
  );
}
