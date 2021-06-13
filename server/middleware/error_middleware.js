import config from "../../config";

const { CODE } = config;

const invalidError = (err, req, res, next) => {
  if (res.statusCode !== CODE.ERR) {
    next(err);
    return;
  }
  res.status(CODE.ERR).send({
    message: err.message || "Invalid Error",
    errors: [err],
  });
};
const unauthorizedError = (err, req, res, next) => {
  if (res.statusCode !== CODE.UNAUTHORIZED) {
    next(err);
    return;
  }
  res.status(CODE.UNAUTHORIZED).send({
    message: err.message || "Unauthorized Error",
    errors: [err],
  });
};

const notfoundError = (err, req, res, next) => {
  if (res.statusCode !== CODE.NOT_FOUND) {
    next(err);
    return;
  }
  res.status(CODE.NOT_FOUND).send({
    message: err.message || "Not Found Error",
    errors: [err],
  });
};

const genericError = (err, req, res) => {
  if (typeof res === "function") {
    req.status(CODE.NOT_FOUND).send({
      message: "URL not found",
    });
  } else {
    res.status(CODE.GENERIC_ERROR).send({
      message: err.message || "Internal server error",
      errors: [err],
    });
  }
};

export default [invalidError, unauthorizedError, notfoundError, genericError];
