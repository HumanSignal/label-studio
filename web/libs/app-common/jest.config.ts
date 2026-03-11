/* eslint-disable */
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
};
