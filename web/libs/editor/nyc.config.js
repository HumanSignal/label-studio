'use strict';

const defaultExtension = [
  '.js',
  '.cjs',
  '.mjs',
  '.ts',
  '.tsx',
  '.jsx',
];
const testFileExtensions = defaultExtension
  .map(extension => extension.slice(1))
  .join(',');
const defaultExclude = [
  'coverage/**',
  'packages/*/test{,s}/**',
  '**/*.d.ts',
  'test{,s}/**',
  `test{,-*}.{${testFileExtensions}}`,
  `**/*{.,-}test.{${testFileExtensions}}`,
  '**/__tests__/**',

  /* Exclude common development tool configuration files */
  '**/{ava,babel,nyc}.config.{js,cjs,mjs}',
  '**/jest.config.{js,cjs,mjs,ts}',
  '**/{karma,rollup,webpack}.config.js',
  '**/.{eslint,mocha}rc.{js,cjs}',
];

module.exports = {
  include: ['src/**'],
  exclude: ['src/examples/**', 'src/setupTests.js'].concat(defaultExclude),
  reporter: ['html'],
  reportDir: './coverageReport',
  tempDir: './coverage',
  extension: defaultExtension,
  cwd: __dirname,
};
