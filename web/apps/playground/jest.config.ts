/* eslint-disable */
const isCi = Boolean(process.env.CI);

export default {
  displayName: "playground",
  preset: "../../jest.preset.js",
  transform: {
    "^(?!.*\\.(js|jsx|ts|tsx|css|json)$)": "@nx/react/plugins/jest",
    "^.+\\.[tj]sx?$": ["babel-jest", { presets: ["@nx/react/babel"] }],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  moduleNameMapper: {
    "^react-markdown$": "<rootDir>/../../libs/editor/__mocks__/react-markdown.tsx",
    "^rehype-raw$": "<rootDir>/../../libs/editor/__mocks__/rehype-raw.ts",
    "^apps/playground/(.*)$": "<rootDir>/$1",
  },
  coverageDirectory: "../../coverage/apps/playground",
  // In CI, fewer workers reduces peak memory while coverage is collected and merged (parent process
  // still holds the combined result). Locally we keep Jest's default for speed.
  ...(isCi ? { maxWorkers: 2, workerIdleMemoryLimit: "512MB" } : {}),
};
