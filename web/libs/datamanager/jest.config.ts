/* eslint-disable */
const isCi = Boolean(process.env.CI);

export default {
  displayName: "datamanager",
  preset: "../../jest.preset.js",
  transform: {
    "^(?!.*\\.(js|jsx|ts|tsx|css|json)$)": "@nx/react/plugins/jest",
    "^.+\\.[tj]sx?$": ["babel-jest", { presets: ["@nx/react/babel"] }],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  coverageDirectory: "../../coverage/libs/datamanager",
  moduleNameMapper: {
    "^react-markdown$": "<rootDir>/../editor/__mocks__/react-markdown.tsx",
    "^rehype-raw$": "<rootDir>/../editor/__mocks__/rehype-raw.ts",
    "\\.(css)$": "identity-obj-proxy",
    "\\.(gif|ttf|eot|svg|png)$": "<rootDir>/__mocks__/fileMock.js",
  },
  // In CI, fewer workers reduces peak memory while coverage is collected and merged (parent process
  // still holds the combined result). Locally we keep Jest's default for speed.
  ...(isCi ? { maxWorkers: 4, workerIdleMemoryLimit: "1024MB" } : {}),
};
