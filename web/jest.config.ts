import { getJestProjectsAsync } from "@nx/jest";
import { pathsToModuleNameMapper } from "ts-jest";

const isCi = Boolean(process.env.CI);

export default async () => ({
  projects: await getJestProjectsAsync(),
  moduleNameMapper: pathsToModuleNameMapper(
    {
      "@humansignal/core": ["libs/core/src/index.ts"],
      "@humansignal/datamanager": ["libs/datamanager/src/index.js"],
      "@humansignal/editor": ["libs/editor/src/index.js"],
      "@humansignal/frontend-test/*": ["libs/frontend-test/src/*"],
      "@humansignal/ui": ["libs/ui/src/index.ts"],
      "@humansignal/icons": ["libs/ui/src/assets/icons"],
      "@humansignal/shad/*": ["./libs/ui/src/shad/*"],
    },
    { prefix: "<rootDir>/../../" },
  ),
  // In CI, fewer workers reduces peak memory while coverage is collected and merged (parent process
  // still holds the combined result). Locally we keep Jest's default for speed.
  ...(isCi ? { maxWorkers: 2, workerIdleMemoryLimit: "512MB" } : {}),
});
