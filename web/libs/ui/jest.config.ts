/* eslint-disable */
export default {
  displayName: "ui",
  preset: "../../jest.preset.js",
  moduleNameMapper: {
    "^react-markdown$": "<rootDir>/__mocks__/react-markdown.tsx",
    "^rehype-raw$": "<rootDir>/__mocks__/rehype-raw.ts",
  },
  transform: {
    "^(?!.*\\.(js|jsx|ts|tsx|css|json)$)": "@nx/react/plugins/jest",
    "^.+\\.[tj]sx?$": ["babel-jest", { presets: ["@nx/react/babel"] }],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  coverageDirectory: "../../coverage/libs/ui",
  coverageReporters: ["json", "text"],
};
