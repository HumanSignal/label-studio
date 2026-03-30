import type { Config } from "jest";

const isCi = Boolean(process.env.CI);

const config: Config = {
  projects: [
    "<rootDir>/apps/labelstudio/jest.config.ts",
    "<rootDir>/apps/playground/jest.config.ts",
    "<rootDir>/libs/core/jest.config.ts",
    "<rootDir>/libs/ui/jest.config.ts",
    "<rootDir>/libs/datamanager/jest.config.ts",
    "<rootDir>/libs/editor/jest.config.js",
    "<rootDir>/libs/app-common/jest.config.ts",
  ],
  ...(isCi ? { maxWorkers: 2, workerIdleMemoryLimit: "512MB" } : {}),
};

export default config;
