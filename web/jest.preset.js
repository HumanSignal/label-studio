const nxPreset = require("@nx/jest/preset").default;
const tsconfig = require("./tsconfig.base.json");
const { pathsToModuleNameMapper } = require("ts-jest");

console.log(__dirname);

module.exports = {
  ...nxPreset,
  moduleNameMapper: {
    ...nxPreset.moduleNameMapper,
    ...pathsToModuleNameMapper(tsconfig.compilerOptions.paths, { prefix: "<rootDir>/../../" }),
  },
};
