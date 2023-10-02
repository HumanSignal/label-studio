const fs = require('fs/promises');
const path = require('path');

const v8toIstanbul = require('v8-to-istanbul');
const covDir = './output/coverage';
const resDir = '../coverage';
const basePath = path.resolve('../');
const basePathRegExp = new RegExp((basePath + '\\LabelStudio').replace(/\\/g, '\\\\'), 'g');

const fixBasePath = (path) => {
  return path.replace(basePathRegExp, basePath);
};

async function loadSource(fileName) {
  const source = await fs.readFile(`../build/static/js/${fileName}`);
  
  return source.toString();
}

async function loadSourceMap(fileName) {
  const sourceMap = await fs.readFile(`../build/static/js/${fileName}.map`);

  return JSON.parse(sourceMap.toString().replace(/\/\.\//g, '/'));
}

const convertCoverage = async (fileName) => {
  if (fileName.match('_final.coverage')) return;

  const coverage = require(`${covDir}/${fileName}`);
  const basename = path.basename(fileName).replace('.coverage.json', '');
  const finalName = path.resolve(`${resDir}/${basename}_final.coverage.json`);

  for (const entry of coverage) {
    // Used to get file name
    const sourceFileName = entry.url.match(/(?:http(s)*:\/\/.*\/)(?<file>.*)/).groups.file;

    if (!sourceFileName) continue;

    const scriptSource = await loadSource(sourceFileName);
    const scriptSourceMap = await loadSourceMap(sourceFileName);

    const filePath = path.resolve(`../${sourceFileName}`);

    const converter = new v8toIstanbul(filePath, 0,
      {
        source: scriptSource.toString(),
        sourceMap: {
          sourcemap: scriptSourceMap,
        },
      },
    );

    await converter.load();
    converter.applyCoverage(entry.functions);

    const result = JSON.stringify(converter.toIstanbul(), (key, value) => {
      if (key === '') {
        return Object.fromEntries(Object.entries(value).reduce((res, [key, val]) => {
          res.push([
            fixBasePath(key),
            val,
          ]);
          return res;
        }, []));
      }
      if (key === 'path') {
        return fixBasePath(value);
      }
      return value;
    }, 2);

    // Store converted coverage file which can later be used to generate report
    await fs.writeFile(
      finalName,
      result,
    );
    console.log(`Processed ${basename}`);
  }

  await fs.unlink(`${covDir}/${fileName}`);
};

// read all the coverage file from output/coverage folder
fs.readdir(covDir).then(async files => {
  for (const file of files) {
    await convertCoverage(file);
  }
});
