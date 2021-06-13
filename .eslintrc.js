module.exports = {
  env: {
    browser: true,
    es6: true,
    jest: true,
  },
  extends: ["airbnb-base", "prettier"],
  plugins: ["prettier"],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
  },
  rules: {
    "prettier/prettier": "error",
    "no-underscore-dangle": "off",
    "no-restricted-syntax": "off",
    "guard-for-in": "off",
    "no-param-reassign": "off",
  },
  settings: {
    jest: {
      version: 26,
    },
  },
};
