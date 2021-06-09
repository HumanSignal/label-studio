module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  globals: {
    process: true,
    __dirname: true,
    APP_SETTINGS: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: "module",
  },
  plugins: ["react", "@typescript-eslint"],
  rules: {
    "react/prop-types": "off",
    "react/display-name": "off",
    "react/no-children-prop": "off",
    "react/react-in-jsx-scope": "off",
    "react/jsx-no-target-blank": "off",
    "react/no-unescaped-entities": "off",
    "no-async-promise-executor": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "semi": [2, "always"],
    '@typescript-eslint/indent': ["error", 2],
    "comma-dangle": ["error", "always-multiline"],
  },
};
