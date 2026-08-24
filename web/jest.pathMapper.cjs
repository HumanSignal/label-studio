"use strict";

const { pathsToModuleNameMapper } = require("ts-jest");
const tsconfig = require("./tsconfig.base.json");

/** Shared tsconfig `paths` for all Jest projects (`<rootDir>` = app or lib folder). */
module.exports = pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
  prefix: "<rootDir>/../../",
});
