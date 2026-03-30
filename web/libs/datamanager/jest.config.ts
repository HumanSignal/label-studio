/* eslint-disable */
const jestPathAliases = require("../../jest.pathMapper.cjs");
const isCi = Boolean(process.env.CI);

export default {
  displayName: "datamanager",
  roots: ["<rootDir>/src"],
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.[tj]sx?$": [
      "babel-jest",
      {
        presets: [
          ["@babel/preset-env", { targets: { node: "current" } }],
          ["@babel/preset-react", { runtime: "automatic" }],
          "@babel/preset-typescript",
        ],
      },
    ],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  moduleNameMapper: {
    ...jestPathAliases,
    "\\.(css|less|scss|sass|gif|png|jpe?g|svg)$": "identity-obj-proxy",
    "^react-markdown$": "<rootDir>/../editor/__mocks__/react-markdown.tsx",
    "^rehype-raw$": "<rootDir>/../editor/__mocks__/rehype-raw.ts",
    "\\.(css)$": "identity-obj-proxy",
    "\\.(gif|ttf|eot|svg|png)$": "<rootDir>/__mocks__/fileMock.js",
  },
  moduleDirectories: ["node_modules", "<rootDir>/../../node_modules"],
  transformIgnorePatterns: ["/node_modules/(?!nanoid/)"],
  coverageDirectory: "../../coverage/libs/datamanager",
  ...(isCi ? { maxWorkers: 2, workerIdleMemoryLimit: "512MB" } : {}),
};
