import log4js from "log4js";
import config from "../../config";

const appenders = {
  out: { type: "stdout" },
  everything: { type: "stdout" },
};

const categories = {
  default: { appenders: ["everything", "out"], level: "error" },
  contract: {
    appenders: ["everything", "out"],
    level: "debug",
  },
};

if (config.log && config.log.errorFile) {
  appenders.logFile = { type: "file", filename: "errors.log" };
  categories.default.appenders.push("logFile");
}

log4js.configure({
  appenders,
  categories,
});

/**
 * Create a new logger
 * @param {String} serviceName Service Name for categorize, exp : AUT-SER
 */
function createLogger(serviceName) {
  const logger = log4js.getLogger(serviceName);
  if (config.log && config.log.debug) logger.level = "debug";

  return logger;
}

export default log4js;
export { createLogger };
