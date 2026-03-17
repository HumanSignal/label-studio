/* eslint-disable */
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
};
