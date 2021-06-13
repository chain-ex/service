import { Router } from "express";

// Blockchain
import QuorumWeb3 from "../blockchain/QuorumWeb3";

// Models
import NetworkModel from "../models/network";
import UserModel from "../models/user";

// Helper Functions
import { validate, body } from "../helpers/validation";
import { createLogger } from "../helpers/log";
import {
  successResp,
  successRespExtend,
  errorResp,
} from "../helpers/http_util";

const logger = createLogger("NET_SER");

/**
 * Get network's node info
 * @param {Integer|Object} network
 */
async function getChainInfo(network) {
  logger.debug("getChainInfo start:", network);

  const quorumWeb3 = new QuorumWeb3(network);

  return quorumWeb3.connect().then(() => {
    const web3QueryPromises = [];

    const chainInfo = {};

    web3QueryPromises.push(
      quorumWeb3.getBlockNumber().then((result) => {
        chainInfo.blockCount = result;
      })
    );

    web3QueryPromises.push(
      quorumWeb3.getChainId().then((result) => {
        chainInfo.chainId = result;
      })
    );

    web3QueryPromises.push(
      quorumWeb3.getNodeInfo().then((result) => {
        chainInfo.nodeInfo = result;
      })
    );

    return Promise.all(web3QueryPromises)
      .then(() => {
        logger.debug("getChainInfo", chainInfo);
        return chainInfo;
      })
      .catch((err) => {
        logger.error("getChainInfo", err);
        throw err;
      });
  });
}

/**
 * Get list of public or owned networks by using pagination
 */
function getMany(req, res) {
  const currentUserID = Number(req.userData.uid);
  const { page = 1, pageSize = 20 } = req.query;

  logger.debug("getMany start:", req.query, currentUserID);

  NetworkModel.query(function queryBuilder(qb) {
    qb.where({
      owner_id: currentUserID,
    }).orWhere({
      is_public: true,
    });
  })
    .fetchPage({
      page,
      pageSize,
    })
    .then((result) => {
      logger.debug("getMany :", result.models, result.pagination);
      successRespExtend(res, {
        data: result.models,
        pagination: result.pagination,
      });
    })
    .catch((err) => {
      logger.error("getMany : ", err);
      errorResp(res, err);
    });
}

/**
 * Get one network detail by using id
 */
function getOne(req, res) {
  const currentUserID = Number(req.userData.uid);
  const { networkID } = req.params;
  logger.debug("getOne start : ", networkID, currentUserID);

  NetworkModel.where({
    id: networkID,
  })
    .fetch()
    .then((networkObj) => {
      const network = networkObj.toJSON();

      logger.debug("getOne :", networkID, network);

      getChainInfo(network)
        .then((chainInfo) => {
          successResp(res, { ...network, chain: chainInfo });
        })
        .catch((err) => {
          successResp(res, { ...network, chainError: err.message });
        });
    })
    .catch((err) => {
      logger.error("getOne :", err);
      errorResp(res, err);
    });
}

/**
 * Update network information without ip address and port
 */
function update(req, res) {
  const currentUserID = Number(req.userData.uid);
  const { networkID } = req.params;
  const data = req.body;

  logger.debug(`update start ${networkID} :`, data);

  delete data.owner_id;
  delete data.ip_address;
  delete data.ws_port;

  // Update Query
  NetworkModel.where({
    owner_id: currentUserID,
    id: Number(networkID),
  })
    .save(data, { method: "update" })
    .then((updatedData) => {
      logger.debug(`update ${networkID} : `, updatedData);
      successResp(res, updatedData);
    })
    .catch((err) => {
      logger.error(`update ${networkID} `, err);
      errorResp(res, err);
    });
}

const router = Router();

router.route("/").get(getMany);

router.route("/:networkID").get(getOne).put(update);

export default router;
