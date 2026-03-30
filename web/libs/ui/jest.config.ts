/* eslint-disable */
const jestPathAliases = require("../../jest.pathMapper.cjs");
const isCi = Boolean(process.env.CI);

export default {
  displayName: "ui",
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
    "\\.svg$": "<rootDir>/../../__mocks__/svgMock.cjs",
    "\\.(css|less|scss|sass|gif|png|jpe?g)$": "identity-obj-proxy",
    "^react-markdown$": "<rootDir>/__mocks__/react-markdown.tsx",
    "^rehype-raw$": "<rootDir>/__mocks__/rehype-raw.ts",
  },
  moduleDirectories: ["node_modules", "<rootDir>/../../node_modules"],
  transformIgnorePatterns: ["node_modules/?!(nanoid|konva|@adobe)"],
  coverageDirectory: "../../coverage/libs/ui",
  coverageReporters: ["json", "text"],
  ...(isCi ? { maxWorkers: 2, workerIdleMemoryLimit: "512MB" } : {}),
};
