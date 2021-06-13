import _ from "lodash";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({
  path: path.resolve(__dirname, `${process.env.NODE_ENV}.env`),
});
const packageJSON = require("../package.json");

const defaults = {
  env: process.env.NODE_ENV || "development",
  debug: process.env.DEBUG,
  version: packageJSON.version,
  apiVersion: "v0",
  baseURL: "localhost",
  saltingRounds: 10,
  logLevels: [],
  CODE: {
    OK: 200,
    CREATED: 201,
    OK_NO_DATA: 204,
    ERR: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    GENERIC_ERROR: 500,
  },
  MAIL_KEY: process.env.MAIL_KEY,
  emailTemplates: {
    register: process.env.MAIL_TEMPLATE_REGISTER,
    reset: process.env.MAIL_TEMPLATE_RESET,
  },
  cryptoConfig: {
    simetricKey: process.env.CRYPTO_SYMMETRIC_KEY,
  },
};

// eslint-disable-next-line import/no-dynamic-require
const appropriate = require(`./${defaults.env}`).default;
export default _.merge(defaults, appropriate || {});
