import jwt from "jsonwebtoken";
import config from "../../config";

const { CODE } = config;

const authorizationControl = (req, res, next) => {
  const { Authorization, authorization } = req.headers;
  jwt.verify(
    Authorization || authorization,
    config.jwt.secret,
    (err, decodedData) => {
      if (err) {
        res.statusCode = CODE.UNAUTHORIZED;
        next(new Error("Invalid Authorization Token"));
        return;
      }

      req.userData = decodedData;
      next();
    }
  );
};

export default [authorizationControl];
