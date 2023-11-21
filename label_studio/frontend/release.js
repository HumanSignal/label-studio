const fs = require('fs');
const toml = require('toml');

const packageFile = fs.readFileSync("../../pyproject.toml").toString();

const parsedToml = toml.parse(packageFile);

const packageName = parsedToml.tool.poetry.name;
const versionNumber = parsedToml.tool.poetry.version;

module.exports.name = packageName;
module.exports.version = versionNumber;

module.exports.getReleaseName = () => {
  const version = require("./release");
  return `${version.name}@${version.version}-frontend`
}
