/* eslint-disable */
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
};
