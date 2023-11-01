/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  'bail': true,
  'roots': [
    '<rootDir>/src',
  ],
  'preset': 'ts-jest',
  'setupFilesAfterEnv': ['./jest.setup.js'],
  'testEnvironment': 'jsdom',
  'verbose': false,
  'collectCoverageFrom': [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/examples/**',
  ],
  'coverageDirectory': 'coverage',
  'coverageReporters': ['json'],
  'coverageThreshold': {
    'global': {
      'branches': 1,
      'functions': 1,
      'lines': 1,
      'statements': 1,
    },
  },
  'transform': {
    '^.+\\.[tj]sx?$': ['babel-jest', {
      'presets': [
        ['@babel/preset-react', {
          'runtime': 'automatic',
        }],
        '@babel/preset-typescript',
        ['@babel/preset-env', {
          'targets': {
            'browsers': ['last 2 Chrome versions'],
            'node': 'current',
          },
        }],
      ],
      'plugins': [
        ['babel-plugin-import', { 'libraryName': 'antd' }],
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-private-methods',
        '@babel/plugin-proposal-optional-chaining',
        '@babel/plugin-proposal-nullish-coalescing-operator',
      ],
    }],
  },
  'moduleFileExtensions': [
    'js',
    'ts',
    'jsx',
    'tsx',
  ],
  'moduleDirectories': [
    'node_modules',
  ],
  'moduleNameMapper': {
    '^konva': 'konva/konva',
    '^keymaster': 'identity-obj-proxy',
    '^react-konva-utils': 'identity-obj-proxy',
    '\\.(s[ac]ss|css|styl|svg|png|jpe?g)$': 'identity-obj-proxy',
  },
  'testPathIgnorePatterns': [
    '/node_modules/',
    '/e2e/',
  ],
  'testRegex': '__tests__/.*.test.[tj]sx?',
  'transformIgnorePatterns': [
    'node_modules/?!(nanoid|konva)',
  ],
};
