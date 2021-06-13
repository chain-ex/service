import { Router } from "express";
import { v4 as uuidv4 } from "uuid";

// Middlewares
import ApplicationAuthMiddleware from "../middleware/application_auth_middleware";

// Models
import ApiKeyModel from "../models/apiKey";

// Helper Functions
import { validate, body } from "../helpers/validation";
import { createLogger } from "../helpers/log";
import {
  successResp,
  successRespExtend,
  errorResp,
} from "../helpers/http_util";

const logger = createLogger("API_KEY_SER");

const generateApiKey = (req, res) => {
  const { application_id } = req.body;

  ApiKeyModel.forge({
    token: uuidv4(),
    application_id,
    created_by: Number(req.userData.uid),
  })
    .save()
    .then((insertedObj) => {
      successResp(res, insertedObj, "CREATED");
    });
};

const getApiKeyList = (req, res) => {
  const { appID } = req.query;
  logger.debug("getApiKeyList", appID);
  ApiKeyModel.query(function queryBuilder(qb) {
    qb.where({
      application_id: appID,
    }).whereIn("application_id", req.availableApps);
  })
    .fetchAll({
      columns: ["id", "token", "application_id", "created_by"],
      require: false,
    })
    .then((result) => {
      logger.debug("getApiKeyList fetched", result);
      successResp(res, result);
    })
    .catch((err) => {
      logger.debug("getApiKeyList :", err);
      errorResp(res, err);
    });
};
const deleteApiKey = (req, res) => {
  const { application_id, api_key } = req.body;
  logger.debug("deleteApiKey start:", application_id, api_key);
  ApiKeyModel.query(function queryBuilder(qb) {
    qb.where({
      token: api_key,
      application_id,
    }).whereIn("application_id", req.availableApps);
  })
    .destroy()
    .then(() => {
      logger.debug("deleteApiKey success");
      successResp(res);
    });
};
const router = Router();

function checkAppID(req, res, next) {
  logger.debug("checkAppID :", req.query.appID);
  if (req.availableApps.includes(Number(req.query.appID))) {
    next();
  } else {
    errorResp(res, new Error("Unauthorized Application"), "UNAUTHORIZED");
  }
}

router.use("/", ApplicationAuthMiddleware);

router
  .route("/")
  .post(generateApiKey)
  .get(checkAppID, getApiKeyList)
  .delete(deleteApiKey);

export default router;
