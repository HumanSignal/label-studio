const jestPathAliases = require("../../jest.pathMapper.cjs");
const isCi = Boolean(process.env.CI);

/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  roots: ["<rootDir>/src"],
  setupFilesAfterEnv: ["./jest.setup.js"],
  testEnvironment: "jsdom",
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    // @todo they actually don't work, so we had to add `istanbul ignore` directive to some files
    "!**/__mocks__/**",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/examples/**",
    // it breaks internal coverage counters because of dynamic imports
    "!src/**/SplitChannel.ts",
  ],
  coverageDirectory: "../../coverage",
  coverageReporters: ["json", "lcov", "text"],
  coverageThreshold: {
    global: {
      branches: 1,
      functions: 1,
      lines: 1,
      statements: 1,
    },
  },
  transform: {
    "^.+\\.[tj]sx?$": [
      "babel-jest",
      {
        babelrc: false,
        configFile: false,
        presets: [
          [
            "@babel/preset-react",
            {
              runtime: "automatic",
            },
          ],
          "@babel/preset-typescript",
          [
            "@babel/preset-env",
            {
              targets: {
                browsers: ["last 2 Chrome versions"],
                node: "current",
              },
            },
          ],
        ],
        plugins: [
          ["babel-plugin-import", { libraryName: "antd", style: false }],
          "@babel/plugin-proposal-class-properties",
          "@babel/plugin-proposal-private-methods",
          "@babel/plugin-proposal-optional-chaining",
          "@babel/plugin-proposal-nullish-coalescing-operator",
        ],
      },
    ],
  },
  moduleFileExtensions: ["js", "ts", "jsx", "tsx"],
  moduleDirectories: ["node_modules"],
  moduleNameMapper: {
    ...jestPathAliases,
    "^konva": "konva/konva",
    "^keymaster": "identity-obj-proxy",
    "^react-konva-utils": "identity-obj-proxy",
    "\\.(css|svg|png|jpe?g)$": "identity-obj-proxy",
    "^@adobe/css-tools$": "<rootDir>/../../__mocks__/@adobe/css-tools.js",
    "^@humansignal/ui$": "<rootDir>/../ui/src/index.ts",
  },
  testPathIgnorePatterns: [
    "/node_modules/",
    "/e2e/",
    // Full-app renderEditor tests require MST/load order not available in this env; skip until integration setup is ready.
    "renderEditor\\.test\\.",
    "AreaMixinMockResult\\.js",
  ],
  transformIgnorePatterns: ["node_modules/?!(nanoid|konva|@adobe)"],
  // In CI, fewer workers reduces peak memory while coverage is collected and merged (parent process
  // still holds the combined result). Locally we keep Jest's default for speed.
  ...(isCi ? { maxWorkers: 2, workerIdleMemoryLimit: "512MB" } : {}),
};
