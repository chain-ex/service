import redis from "redis";
import InternalCache from "node-cache";
import { createLogger } from "../server/helpers/log";
import config from "../config";

const internalCache = new InternalCache();

const logger = createLogger("CACHE");

const cache = redis.createClient({
  host: config.cacheConfig.host,
  port: config.cacheConfig.port,
  password: config.cacheConfig.password,
});

cache.on("error", (error) => {
  // logger.error("OnError :", error);
});

function addPreFix(key) {
  return `${config.env}-${key}`;
}

// Caching Functions

const get = async (key) => {
  key = addPreFix(key);
  logger.debug("get start :", key);

  return new Promise((resolve, reject) => {
    if (!cache.connected) {
      reject(new Error("Connection Error"));
    }
    cache.get(key, (err, value) => {
      if (err) {
        logger.error("get :", err);
        reject(err);
      }
      logger.debug("get :", key, value);
      resolve(value);
    });
  });
};

const set = async (key, value) => {
  key = addPreFix(key);
  logger.debug("set start :", key, value);
  return new Promise((resolve, reject) => {
    if (!cache.connected) {
      reject(new Error("Connection Error"));
    }
    if (typeof value === "object") {
      value = JSON.stringify(value);
    }
    cache.set(key, value, (err) => {
      if (err) {
        logger.error("set :", err);
        reject(err);
      }
      resolve();
    });
  });
};

const incr = async (key, expireTime) => {
  logger.debug("incr start :", key);
  key = addPreFix(key);
  return new Promise((resolve, reject) => {
    if (!cache.connected) {
      reject(new Error("Connection Error"));
    }
    const commands = [];
    commands.push(["incr", key]);
    if (expireTime) {
      commands.push(["EXPIRE", key, expireTime]);
    }

    cache.multi(commands).exec((err, replies) => {
      if (err) {
        logger.error("incr :", err);
        reject(err);
      }
      resolve(replies[0]);
    });
  });
};

const setIncr = async (key, startValue, expireTime) => {
  logger.debug("incr setIncr :", key, startValue);
  key = addPreFix(key);
  return new Promise((resolve, reject) => {
    if (!cache.connected) {
      reject(new Error("Connection Error"));
    }
    const commands = [];

    commands.push(["setnx", key, startValue]);
    commands.push(["incr", key]);

    if (expireTime) {
      commands.push(["EXPIRE", key, expireTime]);
    }

    // commands.push(["incr", key]);

    cache.multi(commands).exec((err, replies) => {
      if (err) {
        logger.error("setIncr :", err);
        reject(err);
      }
      resolve(replies[1]);
    });
  });
};

const del = async (key) => {
  logger.debug("del start :", key);
  key = addPreFix(key);
  return new Promise((resolve, reject) => {
    if (!cache.connected) {
      reject(new Error("Connection Error"));
    }
    const commands = [];
    commands.push(["del", key]);

    cache.multi(commands).exec((err, replies) => {
      if (err) {
        logger.error("del :", err);
        reject(err);
      }
      resolve(replies[0]);
    });
  });
};

module.exports.get = get;
module.exports.set = set;
module.exports.del = del;
module.exports.incr = incr;
module.exports.setIncr = setIncr;
module.exports.internalCache = internalCache;
