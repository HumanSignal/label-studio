/* eslint-disable */
const jestPathAliases = require("../../jest.pathMapper.cjs");
const isCi = Boolean(process.env.CI);

export default {
  displayName: "labelstudio",
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
    "^apps/labelstudio/(.*)$": "<rootDir>/src/$1",
  },
  moduleDirectories: ["node_modules", "<rootDir>/../../node_modules"],
  coverageDirectory: "../../coverage/apps/labelstudio",
  ...(isCi ? { maxWorkers: 2, workerIdleMemoryLimit: "512MB" } : {}),
};
