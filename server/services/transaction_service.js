import { Router } from "express";
import TransactionModel from "../models/transaction";
import ContractModel from "../models/contract";
import {
  errorResp,
  successRespExtend,
  successResp,
} from "../helpers/http_util";
import ApplicationAuthMiddleware from "../middleware/application_auth_middleware";

import { createLogger } from "../helpers/log";

const logger = createLogger("TX_SER");

const txColumns = ["id", "short_id", "hash", "from_address", "status"];

function getContractsByNetworkID(req, res, next) {
  const { networkID } = req.query;
  if (networkID) {
    logger.debug("getContractsByNetworkID start :", networkID);
    ContractModel.query(function queryBuilder(qb) {
      qb.where({ network_id: Number(networkID) }).whereIn(
        "application_id",
        req.availableApps
      );
    })
      .fetchAll({
        columns: ["short_id"],
      })
      .then((contracts) => {
        logger.debug("getContractsByNetworkID contracts fetched :", contracts);
        req.contractNetworkShortIDs = contracts.map((ctr) =>
          ctr.get("short_id")
        );
        next();
      })
      .catch((err) => {
        errorResp(res, err);
      });
  } else {
    next();
  }
}
function getTxWithNetworkID(req, res, next) {
  const { networkID, page = 1, pageSize = 20 } = req.query;
  if (networkID) {
    logger.debug(
      "getTxWithNetworkID :",
      networkID,
      req.contractNetworkShortIDs
    );
    TransactionModel.query(function queryBuilder(qb) {
      qb.whereIn("short_id", req.contractNetworkShortIDs);
    })
      .orderBy("created_at", "DESC")
      .fetchPage({ page, pageSize, columns: txColumns })
      .then((result) => {
        logger.debug(
          "getTxWithNetworkID transactions fetched in the network:",
          result.models,
          result.pagination
        );
        successRespExtend(res, {
          data: result.models,
          pagination: result.pagination,
        });
      })
      .catch((err) => {
        logger.error(
          "getTxWithNetworkID Fetch transaction in the network error :",
          err
        );
        errorResp(res, err);
      });
  } else {
    next();
  }
}
function getContractsWithAppID(req, res, next) {
  const { appID } = req.query;
  if (appID) {
    logger.debug("getContractsWithAppID start :", appID, req.availableApps);

    ContractModel.query(function queryBuilder(qb) {
      qb.where({ application_id: appID }).whereIn(
        "application_id",
        req.availableApps
      );
    })
      .orderBy("created_at", "DESC")
      .fetchAll({ columns: ["short_id"] })
      .then((contracts) => {
        logger.debug("getContractsWithAppID contracts fetched :", contracts);
        req.contractAppShortIDs = contracts.map((ctr) => ctr.get("short_id"));
        next();
      })
      .catch((err) => {
        logger.error("getContractsWithAppID error :", err);
        errorResp(res, err);
      });
  } else {
    next();
  }
}
function getTxWithAppID(req, res, next) {
  const { appID, page = 1, pageSize = 20 } = req.query;
  if (appID) {
    logger.debug("getTxWithAppID :", appID, req.contractAppShortIDs);
    TransactionModel.query(function queryBuilder(qb) {
      qb.whereIn("short_id", req.contractAppShortIDs);
    })
      .orderBy("created_at", "DESC")
      .fetchPage({ page, pageSize, columns: txColumns })
      .then((result) => {
        logger.debug(
          "getTxWithAppID transactions fetched in the app:",
          result.models,
          result.pagination
        );
        successRespExtend(res, {
          data: result.models,
          pagination: result.pagination,
        });
      })
      .catch((err) => {
        logger.error(
          "getTxWithAppID Fetch transaction in the app error :",
          err
        );
        errorResp(res, err);
      });
  } else {
    next();
  }
}
function getTxWithShortID(req, res) {
  const { shortID, page = 1, pageSize = 20 } = req.query;

  if (shortID) {
    logger.debug("getMany started for contract:", shortID);

    TransactionModel.where({
      short_id: shortID,
    })
      .orderBy("created_at", "DESC")
      .fetchPage({
        page,
        pageSize,
        columns: txColumns,
      })
      .then((result) => {
        logger.debug(
          "Transactions fetched for contract :",
          result.models,
          result.pagination
        );
        successRespExtend(res, {
          data: result.models,
          pagination: result.pagination,
        });
      })
      .catch((err) => {
        logger.error("Transaction fetch error in contract :", err);
        errorResp(res, err);
      });
  } else {
    errorResp(
      res,
      new Error(
        "Please enter at least one of the following -> [ne;tworkI, appID, shortID]"
      )
    );
  }
}

const getOne = (req, res) => {
  const { hash } = req.params;
  logger.debug("getOne started :", hash);
  TransactionModel.where({
    hash,
  })
    .fetch()
    .then((transactionDetail) => {
      logger.debug("transaction fetched :", transactionDetail);
      successResp(res, transactionDetail);
    })
    .catch((err) => {
      logger.error("transaction fetch error :", err);
      errorResp(res, err);
    });
};

const router = Router();
router.use("/", ApplicationAuthMiddleware);
router
  .route("/")
  .get(
    getContractsByNetworkID,
    getTxWithNetworkID,
    getContractsWithAppID,
    getTxWithAppID,
    getTxWithShortID
  );

router.route("/:hash").get(getOne);

export default router;
