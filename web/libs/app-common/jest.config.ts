/* eslint-disable */
const isCi = Boolean(process.env.CI);

export default {
  displayName: "app-common",
  preset: "../../jest.preset.js",
  moduleNameMapper: {
    "^react-markdown$": "<rootDir>/../ui/__mocks__/react-markdown.tsx",
    "^rehype-raw$": "<rootDir>/../ui/__mocks__/rehype-raw.ts",
  },
  transform: {
    "^(?!.*\\.(js|jsx|ts|tsx|css|json)$)": "@nx/react/plugins/jest",
    "^.+\\.[tj]sx?$": ["babel-jest", { presets: ["@nx/react/babel"] }],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  coverageDirectory: "../../coverage/libs/app-common",
  // In CI, fewer workers reduces peak memory while coverage is collected and merged (parent process
  // still holds the combined result). Locally we keep Jest's default for speed.
  ...(isCi ? { maxWorkers: 2, workerIdleMemoryLimit: "512MB" } : {}),
};
