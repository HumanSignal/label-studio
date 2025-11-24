const { pathsToModuleNameMapper } = require("ts-jest");
const tsconfig = require("../../tsconfig.base.json");
/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  bail: true,
  roots: ["<rootDir>/src"],
  preset: "../../jest.preset.js",
  setupFilesAfterEnv: ["./jest.setup.js"],
  testEnvironment: "jsdom",
  verbose: false,
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
    "^konva": "konva/konva",
    "^keymaster": "identity-obj-proxy",
    "^react-konva-utils": "identity-obj-proxy",
    "\\.(s[ac]ss|css|svg|png|jpe?g)$": "identity-obj-proxy",
    "^@adobe/css-tools$": "<rootDir>/../../__mocks__/@adobe/css-tools.js",
    "^@humansignal/ui": "<rootDir>/../ui/src/index.ts",
    ...pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
      prefix: "<rootDir>/../../",
    }),
  },
  testPathIgnorePatterns: ["/node_modules/", "/e2e/"],
  transformIgnorePatterns: ["node_modules/?!(nanoid|konva|@adobe)"],
};
