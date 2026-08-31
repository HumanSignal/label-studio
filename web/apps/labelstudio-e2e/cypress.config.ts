import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    specPattern: "src/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "src/support/e2e.ts",
    baseUrl: "http://localhost:8080/",
    injectDocumentDomain: true,
  },
});
