import { Router } from "express";
import ApplicationAuthMiddleware from "../middleware/application_auth_middleware";

// Models
import WebhookModel from "../models/webhook";
import WebhookLogModel from "../models/webhookLog";
import ContractModel from "../models/contract";

// Helpers
import { successResp, errorResp } from "../helpers/http_util";
import { createLogger } from "../helpers/log";

const logger = createLogger("WEBH_SER");

/**
 * Get list of webhooks
 */
function getWebhooks(req, res) {
  const { shortID, page = 1, pageSize = 20 } = req.query;
  logger.debug("getWebhooks start :", shortID, req.query);
  logger.debug("getWebhooks availableApps :", req.availableApps);
  ContractModel.where({ short_id: shortID })
    .fetch()
    .then((contractAppID) => {
      logger.debug(
        "getWebhooks contractAppID :",
        contractAppID.get("application_id")
      );

      if (req.availableApps.includes(contractAppID.get("application_id"))) {
        WebhookModel.where({ short_id: shortID })
          .fetchPage({
            columns: ["id", "name", "description"],
            require: false,
            pageSize,
            page,
          })
          .then((webhooks) => {
            webhooks = webhooks.toJSON();
            logger.debug("getWebhooks fetched :", webhooks);
            successResp(res, webhooks);
          })
          .catch((err) => {
            logger.error("getWebhooks error :", err);
            errorResp(res, err);
          });
      } else {
        errorResp(res, new Error("Unauthorized user for this contract"));
      }
    })
    .catch((err) => {
      logger.error("getWebhook error: ", err);
      errorResp(res, err);
    });
}

/**
 * Get one webhook details
 */
function getOneWebhook(req, res) {
  const { id } = req.params;
  logger.debug("getOneWebhook start :", id);
  WebhookModel.where({ id })
    .fetch()
    .then((webhook) => {
      webhook = webhook.toJSON();
      logger.debug("getOneWebhook fetched :", webhook);
      successResp(res, webhook);
    })
    .catch((err) => {
      logger.error("getOneWebhook error :", err);
      errorResp(res, err);
    });
}

/**
 *
 */
function updateWebhook(req, res) {
  const { id } = req.params;
  const { name, description, url, authorization } = req.body;
  logger.debug("updateWebhook start :", id, req.body);

  WebhookModel.where({ id })
    .save({ name, description, url, authorization }, { method: "update" })
    .then((updatedWebhook) => {
      updatedWebhook = updatedWebhook.toJSON();
      logger.debug("updateWebhook fetched :", updatedWebhook);
      successResp(res, updatedWebhook);
    })
    .catch((err) => {
      logger.error("updateWebhook error :", err);
      errorResp(res, err);
    });
}

/**
 *
 *
 */
function addWebhook(req, res) {
  const { name, description, url, authorization, short_id } = req.body;
  logger.debug("addWebhook start :", url);
  WebhookModel.forge({
    name,
    description,
    url,
    authorization,
    short_id,
  })
    .save()
    .then((addedWebhook) => {
      addedWebhook = addedWebhook.toJSON();
      logger.debug("addWebhook forged :", addedWebhook);
      successResp(res, addedWebhook, "CREATED");
    })
    .catch((err) => {
      logger.error("addWebhook error :", err);
      errorResp(res, err);
    });
}

function getWebhookLogs(req, res) {
  const { id } = req.params;
  const { page = 1, pageSize = 20 } = req.query;
  logger.debug("getWebhookLogs start :", id);
  WebhookLogModel.where({ webhook_id: id })
    .fetchPage({
      columns: ["status", "url"],
      require: false,
      pageSize,
      page,
    })
    .then((webhookLogs) => {
      webhookLogs = webhookLogs.toJSON();
      logger.debug("getWebhookLogs fetched :", webhookLogs);
      successResp(res, webhookLogs);
    })
    .catch((err) => {
      logger.error("getWebhookLogs error :", err);
      errorResp(res, err);
    });
}
function getWebhookLogDetail(req, res) {
  const { id, logID } = req.params;
  logger.debug("getWebhookLogDetail start :", id, logID);
  WebhookLogModel.where({ id: logID, webhook_id: id })
    .fetch()
    .then((webhookLogDetail) => {
      webhookLogDetail = webhookLogDetail.toJSON();
      logger.debug("getWebhookLogDetail fetched :", webhookLogDetail);
      successResp(res, webhookLogDetail);
    })
    .catch((err) => {
      logger.error("getWebhookLogDetails error :", err);
      errorResp(res, err);
    });
}

const router = Router();
router.use("/", ApplicationAuthMiddleware);
router.route("/").get(getWebhooks).post(addWebhook);

router.route("/:id").get(getOneWebhook).put(updateWebhook);

router.route("/:id/log").get(getWebhookLogs);

router.route("/:id/log/:logID").get(getWebhookLogDetail);

export default router;
