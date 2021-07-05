const fs = require('fs');

const packageFile = fs.readFileSync("../../label_studio/__init__.py").toString();

const packageName = packageFile.match(/package_name(\s?)=(\s?)'([^']+)'/)[3];
const versionNumber = packageFile.match(/__version__(\s?)=(\s?)'([^']+)'/)[3];

module.exports.name = packageName;
module.exports.version = versionNumber;

module.exports.getReleaseName = () => {
  const version = require("./release");
  return `${version.name}@${version.version}-frontend`
}
