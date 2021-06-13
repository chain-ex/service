import config from "../../../config";

const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");
const publicSwaggerDocument = require("./public_swagger.json");

// Config
const { apiVersion, version, env } = config;

const router = express.Router();

publicSwaggerDocument.info.version = version;
publicSwaggerDocument.info.description += `${env} Environment`;
swaggerDocument.info.version = version;
swaggerDocument.info.description += `${env} Environment`;

const apiPaths = {};

Object.keys(swaggerDocument.paths).forEach((path) => {
  const newPath = path.replace("/api/", `/${apiVersion}/`);

  apiPaths[newPath] = swaggerDocument.paths[path];
});

swaggerDocument.paths = apiPaths;

router.use(
  "/public",
  (req, res, next) => {
    swaggerDocument.host = req.get("host");
    req.swaggerDoc = publicSwaggerDocument;
    next();
  },
  swaggerUi.serve,
  swaggerUi.setup()
);

router.use(
  "/swagger",
  (req, res, next) => {
    swaggerDocument.host = req.get("host");
    req.swaggerDoc = swaggerDocument;
    next();
  },
  swaggerUi.serve,
  swaggerUi.setup()
);

module.exports = router;
