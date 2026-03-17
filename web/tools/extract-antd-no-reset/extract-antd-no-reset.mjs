import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const findNearestNodeModules = (dir) => {
  const nodeModulesPath = path.join(dir, "node_modules");
  if (fs.existsSync(nodeModulesPath)) {
    return nodeModulesPath;
  }
  const parentDir = path.dirname(dir);
  if (parentDir === dir) {
    throw new Error("No node_modules directory found");
  }
  return findNearestNodeModules(parentDir);
};

const nodeModulesPath = findNearestNodeModules(__dirname);
const sourcePath = path.join(nodeModulesPath, "./antd/dist/antd.css");
if (!fs.existsSync(sourcePath)) {
  throw new Error(`Source file not found: ${sourcePath}`);
}
let targetDirPath = path.join(nodeModulesPath, "@humansignal/editor/src/assets/styles");
if (!fs.existsSync(targetDirPath)) {
  if (fs.existsSync(path.join(__dirname, "../../libs/editor/src/assets/styles"))) {
    targetDirPath = path.join(__dirname, "../../libs/editor/src/assets/styles");
  }
}

const targetPath = path.join(targetDirPath, "./antd-no-reset.css");

// Read the source file
const sourceContent = fs.readFileSync(sourcePath, "utf8");

// Extract header and add our custom comments
const header = `/*!
 *
 * antd v4.24.15 (without CSS reset)
 *
 * Copyright 2015-present, Alipay, Inc.
 * All rights reserved.
 *
 * Modified version to exclude global resets
 *
 */
/* This is a modified version of antd.css that excludes global reset styles */
`;

// These are CSS reset selectors we want to remove
const resetSelectors = [
  /^html,\s*body\s*{[\s\S]*?}/m,
  /^input::-ms-clear,\s*input::-ms-reveal\s*{[\s\S]*?}/m,
  /^\*,\s*\*::before,\s*\*::after\s*{[\s\S]*?}/m,
  /^html\s*{[\s\S]*?}/m,
  /^@-ms-viewport\s*{[\s\S]*?}/m,
  /^body\s*{[\s\S]*?}/m,
  /^\[tabindex='-1'\]:focus\s*{[\s\S]*?}/m,
  /^hr\s*{[\s\S]*?}/m,
  /^h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6\s*{[\s\S]*?}/m,
  /^p\s*{[\s\S]*?}/m,
  /^abbr\[title\],\s*abbr\[data-original-title\]\s*{[\s\S]*?}/m,
  /^address\s*{[\s\S]*?}/m,
  /^input\[type='text'\],[\s\S]*?textarea\s*{[\s\S]*?}/m,
  /^ol,\s*ul,\s*dl\s*{[\s\S]*?}/m,
  /^ol ol,[\s\S]*?ul ol\s*{[\s\S]*?}/m,
  /^dt\s*{[\s\S]*?}/m,
  /^dd\s*{[\s\S]*?}/m,
  /^blockquote\s*{[\s\S]*?}/m,
  /^dfn\s*{[\s\S]*?}/m,
  /^b,\s*strong\s*{[\s\S]*?}/m,
  /^small\s*{[\s\S]*?}/m,
  /^sub,\s*sup\s*{[\s\S]*?}/m,
  /^sub\s*{[\s\S]*?}/m,
  /^sup\s*{[\s\S]*?}/m,
  /^a\s*{[\s\S]*?}/m,
  /^a:hover\s*{[\s\S]*?}/m,
  /^a:active\s*{[\s\S]*?}/m,
  /^a:active,\s*a:hover\s*{[\s\S]*?}/m,
  /^a:focus\s*{[\s\S]*?}/m,
  /^a\[disabled\]\s*{[\s\S]*?}/m,
  /^pre,\s*code,\s*kbd,\s*samp\s*{[\s\S]*?}/m,
  /^pre\s*{[\s\S]*?}/m,
  /^figure\s*{[\s\S]*?}/m,
  /^img\s*{[\s\S]*?}/m,
  /^a,\s*area,[\s\S]*?textarea\s*{[\s\S]*?}/m,
  /^table\s*{[\s\S]*?}/m,
  /^caption\s*{[\s\S]*?}/m,
  /^input,\s*button,[\s\S]*?textarea\s*{[\s\S]*?}/m,
  /^button,\s*input\s*{[\s\S]*?}/m,
  /^button,\s*select\s*{[\s\S]*?}/m,
  /^button,\s*html \[type="button"\],[\s\S]*?\[type="submit"\]\s*{[\s\S]*?}/m,
  /^button::-moz-focus-inner,[\s\S]*?\[type='submit'\]::-moz-focus-inner\s*{[\s\S]*?}/m,
  /^input\[type='radio'\],\s*input\[type='checkbox'\]\s*{[\s\S]*?}/m,
  /^input\[type='date'\],[\s\S]*?input\[type='month'\]\s*{[\s\S]*?}/m,
  /^textarea\s*{[\s\S]*?}/m,
  /^fieldset\s*{[\s\S]*?}/m,
  /^legend\s*{[\s\S]*?}/m,
  /^progress\s*{[\s\S]*?}/m,
  /^\[type='number'\]::-webkit-inner-spin-button,\s*\[type='number'\]::-webkit-outer-spin-button\s*{[\s\S]*?}/m,
  /^\[type='search'\]\s*{[\s\S]*?}/m,
  /^\[type='search'\]::-webkit-search-cancel-button,\s*\[type='search'\]::-webkit-search-decoration\s*{[\s\S]*?}/m,
  /^::-webkit-file-upload-button\s*{[\s\S]*?}/m,
  /^output\s*{[\s\S]*?}/m,
  /^summary\s*{[\s\S]*?}/m,
  /^template\s*{[\s\S]*?}/m,
  /^\[hidden\]\s*{[\s\S]*?}/m,
  /^mark\s*{[\s\S]*?}/m,
  /^::-moz-selection\s*{[\s\S]*?}/m,
  /^::selection\s*{[\s\S]*?}/m,
];

// Process the content
let modifiedContent = sourceContent;

// Remove reset selectors one by one
resetSelectors.forEach((selector) => {
  modifiedContent = modifiedContent.replace(selector, "");
});

// Clean up multiple blank lines
modifiedContent = modifiedContent.replace(/\n{3,}/g, "\n\n");

// Replace the original header with our custom header
modifiedContent = modifiedContent.replace(/\/\*![\s\S]*?Alipay[\s\S]*?\*\//, header);

// Remove any other stylelint-disable comments (except the one in our header)
const headerEndPos = modifiedContent.indexOf("/* This is a modified version");
const contentAfterHeader = modifiedContent.substring(headerEndPos);
const contentWithoutStylelintComments = contentAfterHeader.replace(/\/\* stylelint-disable[\s\S]*?\*\//g, "");

// Combine our header with the cleaned content
modifiedContent = modifiedContent.substring(0, headerEndPos) + contentWithoutStylelintComments;

// Clean up multiple blank lines again after removing comments
modifiedContent = modifiedContent.replace(/\n{3,}/g, "\n\n");

// Write the result to the target file
fs.writeFileSync(targetPath, modifiedContent, "utf8");

console.log("Generated antd-no-reset.css successfully!");
