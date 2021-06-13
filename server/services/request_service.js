import { Router } from "express";
import _ from "lodash";
import moment from "moment";

// Helper Functions
import { createLogger } from "../helpers/log";
import {
  successResp,
  successRespExtend,
  errorResp,
} from "../helpers/http_util";

// Middleware
import ApplicationAuthMiddleware from "../middleware/application_auth_middleware";

// Models
import IntegrationRequestModel from "../models/integrationRequest";
import ContractModel from "../models/contract";

const logger = createLogger("REQ_SER");

/**
 * Get Request Stat Count by using shortID list
 * @param  {Integer[]} shortIDList
 * @param  {Date} fromDate
 * @param  {Promise}
 */
function getStatCountFromByShortIDList(shortIDList, fromDate) {
  return IntegrationRequestModel.query(function getQueryBuilder(qb) {
    qb.whereIn("short_id", shortIDList).andWhere("created_at", ">=", fromDate);
  })
    .count("id")
    .then((count) => Number(count));
}

/**
 * Get Request Stat Count by using a shortID
 * @param  {Integer} shortID
 * @param  {Date} fromDate
 * @param  {Promise}
 */
function getStatCountFromByShortID(shortID, fromDate) {
  return IntegrationRequestModel.query(function getQueryBuilder(qb) {
    qb.where("short_id", shortID).andWhere("created_at", ">=", fromDate);
  })
    .count("id")
    .then((count) => Number(count));
}

const getStats = async (req, res) => {
  const currentUserID = req.userData.uid;
  const { shortID } = req.query;
  logger.debug("getStats :", req.query, currentUserID);
  try {
    const mainStatFunc = req.shortIDList
      ? _.curry(getStatCountFromByShortIDList)(req.shortIDList)
      : _.curry(getStatCountFromByShortID)(shortID);
    const statData = {};
    const statPromises = [];
    statPromises.push(
      mainStatFunc(moment().format("YYYY-MM-DD")).then((count) => {
        statData.todayTotal = count;
        logger.debug("getStats todayTotal :", count);
      })
    );
    statPromises.push(
      mainStatFunc(moment().startOf("week").format("YYYY-MM-DD")).then(
        (count) => {
          statData.weekTotal = count;
          logger.debug("getStats weekTotal :", count);
        }
      )
    );
    statPromises.push(
      mainStatFunc(moment().startOf("month").format("YYYY-MM-DD")).then(
        (count) => {
          statData.monthTotal = count;
          logger.debug("getStats monthTotal :", count);
        }
      )
    );
    statPromises.push(
      mainStatFunc(moment().startOf("quarter").format("YYYY-MM-DD")).then(
        (count) => {
          statData.quarterTotal = count;
          logger.debug("getStats quarterTotal :", count);
        }
      )
    );
    statPromises.push(
      mainStatFunc(moment().startOf("year").format("YYYY-MM-DD")).then(
        (count) => {
          statData.yearTotal = count;
          logger.debug("getStats yearTotal :", count);
        }
      )
    );
    Promise.all(statPromises)
      .then(() => {
        logger.debug("getStats :", statData);
        successResp(res, statData);
      })
      .catch((err) => {
        throw err;
      });
  } catch (err) {
    errorResp(res, err);
  }
};

const getManyRequestColumns = ["id", "short_id", "type", "method", "status"];

const getManyRequestByNetwork = async (req, res, next) => {
  const { networkID, page = 1, pageSize = 20 } = req.query;

  if (networkID) {
    logger.debug("getManyRequests with networkID", networkID);
    IntegrationRequestModel.where("short_id", "in", req.shortIDList)
      .fetchPage({
        require: false,
        columns: getManyRequestColumns,
        page,
        pageSize,
      })
      .then((result) => {
        logger.debug("getManyRequests fetched :", result.models.length);
        successRespExtend(res, {
          data: result.models,
          pagination: result.pagination,
        });
      })
      .catch((err) => {
        logger.error("getManyRequests fetch error :", err);
        throw err;
      });
  } else {
    next();
  }
};

const getManyRequestByApp = async (req, res, next) => {
  const { applicationID, page = 1, pageSize = 20 } = req.query;
  if (applicationID) {
    logger.debug(
      "getManyRequests with applicationID",
      applicationID,
      req.shortIDList
    );

    IntegrationRequestModel.where("short_id", "in", req.shortIDList)
      .fetchPage({
        require: false,
        columns: getManyRequestColumns,
        page,
        pageSize,
      })
      .then((result) => {
        logger.debug("getManyRequests fetched :", result.models.length);
        successRespExtend(res, {
          data: result.models,
          pagination: result.pagination,
        });
      })
      .catch((err) => {
        logger.error("getManyRequests fetch error :", err);
        throw err;
      });
  } else {
    next();
  }
};

const getManyRequestByContract = async (req, res) => {
  const { shortID, page = 1, pageSize = 20 } = req.query;
  if (shortID) {
    logger.debug("getManyRequestByContract with shortID", shortID);
    IntegrationRequestModel.where({
      short_id: shortID,
    })
      .fetchPage({
        page,
        pageSize,
        require: false,
        columns: getManyRequestColumns,
      })
      .then((result) => {
        logger.debug(
          "getManyRequestByContract fetched :",
          result.models.length
        );
        successRespExtend(res, {
          data: result.models,
          pagination: result.pagination,
        });
      })
      .catch((err) => {
        logger.debug("getManyRequestByContract error :", err);
        errorResp(res, err);
      });
  } else {
    errorResp(res, new Error("Invalid Parameters"));
  }
};

const getOneRequest = (req, res) => {
  const { id } = req.params;
  logger.debug("getOneRequest start :", id);
  IntegrationRequestModel.where({ id })
    .fetch()
    .then((intReq) => {
      ContractModel.query(function queryBuilder(qb) {
        qb.where({ short_id: intReq.get("short_id") }).whereIn(
          "application_id",
          req.availableApps
        );
      })
        .fetch({ columns: ["id"] })
        .then(() => {
          successResp(res, intReq);
          logger.debug("getOneRequest fetched :", intReq);
        })
        .catch((err) => {
          logger.debug("getOneRequest contract :", err);
          errorResp(res, new Error("No Permission"));
        });
    })
    .catch((err) => {
      logger.error("getOneRequest error :", err);
      errorResp(res, err);
    });
};

// Middleware
const checkAvailability = (req, res, next) => {
  const { applicationID, networkID, shortID } = req.query;

  logger.debug("checkAvailability start :", networkID, applicationID, shortID);
  if (applicationID) {
    if (req.availableApps.includes(Number(applicationID))) {
      ContractModel.query(function queryBuilder(qb) {
        qb.where({
          application_id: applicationID,
        }).whereIn("application_id", req.availableApps);
      })
        .fetchAll({
          columns: ["short_id"],
        })
        .then((result) => {
          req.shortIDList = result.map((value) => value.get("short_id"));
          logger.debug("checkAvailability applicationID:", req.shortIDList);
          next();
        })
        .catch((err) => {
          logger.error("checkAvailability applicationID:", err);
          errorResp(res, new Error("No Contract"));
        });
    } else {
      errorResp(res, new Error("No Permission"));
    }
  } else if (shortID) {
    ContractModel.query(function queryBuilder(qb) {
      qb.where({
        short_id: shortID,
      }).whereIn("application_id", req.availableApps);
    })
      .fetch()
      .then(() => {
        next();
      })
      .catch((err) => {
        logger.error("checkAvailability ShortID: ", err);
        errorResp(res, new Error("No Contract"));
      });
  } else if (networkID) {
    ContractModel.query(function queryBuilder(qb) {
      qb.where({
        network_id: networkID,
      }).whereIn("application_id", req.availableApps);
    })
      .fetchAll({
        columns: ["short_id"],
        require: true,
      })
      .then((result) => {
        req.shortIDList = result.map((value) => value.get("short_id"));
        logger.debug("checkAvailability networkID:", req.shortIDList);
        next();
      })
      .catch((err) => {
        logger.error("checkAvailability networkID:", err);
        errorResp(res, new Error("No Network Application"));
      });
  } else {
    next();
  }
};

const router = Router();
router.use("/", ApplicationAuthMiddleware, checkAvailability);

router.route("/stats/").get(getStats);

router
  .route("/requests/")
  .get(getManyRequestByNetwork, getManyRequestByApp, getManyRequestByContract);

router.route("/requests/:id").get(getOneRequest);

export default router;
