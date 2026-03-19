/* eslint-disable */
const isCi = Boolean(process.env.CI);

export default {
  displayName: "labelstudio",
  preset: "../../jest.preset.js",
  transform: {
    "^(?!.*\\.(js|jsx|ts|tsx|css|json)$)": "@nx/react/plugins/jest",
    "^.+\\.[tj]sx?$": ["babel-jest", { presets: ["@nx/react/babel"] }],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  moduleNameMapper: {
    "^apps/labelstudio/(.*)$": "<rootDir>/$1",
  },
  coverageDirectory: "../../coverage/apps/labelstudio",
  // In CI, fewer workers reduces peak memory while coverage is collected and merged (parent process
  // still holds the combined result). Locally we keep Jest's default for speed.
  ...(isCi ? { maxWorkers: 2, workerIdleMemoryLimit: "512MB" } : {}),
};
