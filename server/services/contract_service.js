/* eslint-disable camelcase */
import { v4 as uuidv4 } from "uuid";
import keccak256 from "keccak256";
import { Router } from "express";
import fileUpload from "express-fileupload";
import QuorumWeb3 from "../blockchain/QuorumWeb3";
import compileFiles from "./compile_service";

// Middlewares
import ApplicationAuthMiddleware from "../middleware/application_auth_middleware";

// Controller

import ContractExistanceController from "../controllers/contract_existance_controller";

// Helpers
import {
  errorResp,
  successResp,
  successRespExtend,
} from "../helpers/http_util";

import crypto from "../helpers/crypto";

// Controllers

// Models
import ContractModel from "../models/contract";
import ContractVersionModel from "../models/contractVersion";
import ContractAccountModel from "../models/contractAccount";

import { createLogger } from "../helpers/log";

const logger = createLogger("CONT_SER");

function createShortID() {
  const [first, second, third] = uuidv4().split("-");
  return first + second + third;
}

function createHash(shortID, metadata) {
  return keccak256(shortID + JSON.stringify(metadata)).toString("hex");
}
function getVersionList(shortID) {
  return ContractVersionModel.where({
    short_id: shortID,
  })
    .orderBy("created_at", "DESC")
    .fetchAll({
      columns: ["id", "description", "tag"],
    });
}

function getVersionByTag(shortID, tag) {
  return ContractVersionModel.where({
    short_id: shortID,
    tag,
  })
    .fetch({
      columns: ["tag", "abi", "contract_address", "name", "description"],
    })
    .then((result) => {
      return result.toJSON();
    });
}

function getLatestVersion(shortID) {
  return ContractVersionModel.where({
    short_id: shortID,
  })
    .orderBy("created_at", "DESC")
    .fetch({
      columns: ["tag", "abi", "contract_address", "name", "description"],
    })
    .then((result) => {
      return result.toJSON();
    });
}

const getMany = async (req, res) => {
  const { networkID } = req.params;
  const { page = 1, pageSize = 20, appID } = req.query;

  logger.debug(`getMany Start : `, networkID, page, pageSize);

  ContractModel.query(function queryBuilder(qb) {
    qb.where({
      network_id: Number(networkID),
      application_id: appID,
      is_deleted: false,
    }).whereIn("application_id", req.availableApps);
  })
    .fetchPage({
      columns: ["id", "short_id", "name", "description"],
      require: false,
      pageSize,
      page,
    })
    .then((result) => {
      logger.debug(`getMany : `, result);
      successRespExtend(res, {
        data: result.models,
        pagination: result.pagination,
      });
    })
    .catch((err) => {
      logger.error(`getMany `, err);
      errorResp(res, err);
    });
};

const getContractDetail = async (req, res) => {
  const { networkID, shortID } = req.params;
  const { tag } = req.query;

  logger.debug("getContractDetail", networkID, shortID);

  try {
    const result = await ContractModel.query(function queryBuilder(qb) {
      qb.where({
        short_id: shortID,
      }).whereIn("application_id", req.availableApps);
    })
      .fetch({ columns: ["short_id", "application_id", "name", "description"] })
      .catch((err) => {
        throw err;
      });

    const returnData = {
      contract: result.toJSON(),
    };

    logger.debug("getContractDetail contract", shortID, returnData.contract);

    returnData.version = tag
      ? await getVersionByTag(shortID, tag).catch((err) => {
          throw err;
        })
      : await getLatestVersion(shortID).catch((err) => {
          throw err;
        });

    logger.debug("getContractDetail version", shortID, returnData.version);

    returnData.versionList = await getVersionList(shortID).catch((err) => {
      throw err;
    });

    logger.debug("getContractDetail returnData", shortID, returnData);

    successResp(res, returnData);
  } catch (err) {
    logger.error("getContractDetail", err);
    errorResp(res, err);
  }
};

const updateContract = async (req, res) => {
  const { networkID, shortID } = req.params;
  const { name, description } = req.body;
  logger.debug(`update start ${shortID} :`, req.body);

  try {
    await ContractModel.query(function queryBuilder(qb) {
      qb.where({
        short_id: shortID,
        network_id: networkID,
      }).whereIn("application_id", req.availableApps);
    })
      .save(
        {
          name,
          description,
        },
        { method: "update" }
      )
      .then((updatedContract) => {
        logger.debug(`contract updated ${shortID} :`, updatedContract);
        successResp(res, updatedContract);
      })
      .catch((err) => {
        throw err;
      });
  } catch (err) {
    logger.error(`update ${shortID} `, err);
    errorResp(res, err);
  }
};
const deleteContract = async (req, res) => {
  const { shortID, networkID } = req.params;
  logger.debug("deleteContract start :", shortID);
  ContractModel.query(function queryBuilder(qb) {
    qb.where({
      short_id: shortID,
      network_id: networkID,
    }).whereIn("application_id", req.availableApps);
  })
    .save({ is_deleted: true }, { method: "update" })
    .then((deletedContract) => {
      logger.debug("deleteContract deleted :", deletedContract);
      successResp(res, deletedContract.get("short_id"), "OK");
    })
    .catch((err) => {
      logger.error("deleteContract error: ", err);
      errorResp(res, err);
    });
};

const addAccount = async (req, res) => {
  const { shortID } = req.params;
  ContractModel.where({ short_id: shortID })
    .fetch({ columns: ["application_id", "network_id"] })
    .then((contract) => {
      if (req.availableApps.includes(contract.get("application_id"))) {
        const networkID = contract.get("network_id");
        logger.debug("addAccount start :", networkID, shortID, req.body.name);
        const currentWeb3 = new QuorumWeb3(networkID);

        currentWeb3
          .newAccount()
          .then((account) => {
            logger.debug("addAccount account created :", account);
            ContractAccountModel.forge({
              name: req.body.name,
              address: account.address,
              private_key: account.privateKey,
              short_id: shortID,
            })
              .save()
              .then((newContractAccount) => {
                logger.debug("addAccount forged :", newContractAccount);
                successResp(res, newContractAccount, "CREATED");
              })
              .catch((err) => {
                logger.error("addAccount forge error :", err);
                errorResp(res, err);
              });
          })
          .catch((err) => {
            logger.error("addAccount create account error :", err);
            errorResp(res, err);
          });
      } else {
        errorResp(res, new Error("Unauthorized user for this contract"));
      }
    })
    .catch((err) => {
      errorResp(res, err);
    });
};

const getOneAccount = async (req, res) => {
  const { id, shortID } = req.params;
  ContractModel.where({ short_id: shortID })
    .fetch({ columns: ["application_id"] })
    .then((contract) => {
      if (req.availableApps.includes(contract.get("application_id"))) {
        logger.debug("getOneAccount :", id);
        ContractAccountModel.where({ id })
          .fetch()
          .then((account) => {
            logger.debug("getOneAccount :", account);
            successResp(res, account);
          })
          .catch((err) => {
            logger.error("getOneAccount :", err);
            errorResp(res, err);
          });
      } else {
        errorResp(res, new Error("Unauthorized user for this contract"));
      }
    })
    .catch((err) => {
      errorResp(res, err);
    });
};

const getAccountList = async (req, res) => {
  const { shortID } = req.params;
  const { page = 1, pageSize = 20 } = req.query;
  logger.debug(`getAccountList start: `, shortID, req.query);
  // todo req.avlapp'ten shortidleri çek, shortID bunların içinde mi bak
  ContractModel.where({ short_id: shortID })
    .fetch({ columns: ["application_id"] })
    .then((contractAppID) => {
      if (req.availableApps.includes(contractAppID.get("application_id"))) {
        ContractAccountModel.where({ short_id: shortID })
          .fetchPage({
            page,
            pageSize,
            require: false,
          })
          .then((result) => {
            logger.debug(`getAccountList : `, result);
            successRespExtend(res, {
              data: result.models,
              pagination: result.pagination,
            });
          })
          .catch((err) => {
            logger.error("getAccountList :", err);
            errorResp(res, err);
          });
      } else {
        errorResp(res, new Error("Unauthorized user for this contract"));
      }
    });
};

const updateAccount = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  logger.debug(`updateAccount start: `, id, req.body);
  ContractAccountModel.where({ id })
    .save({ name, description }, { method: "update" })
    .then((updatedAccount) => {
      logger.debug(`updateAccount : `, updatedAccount);
      successResp(res, updatedAccount);
    })
    .catch((err) => {
      logger.error("updateAccount :", err);
      errorResp(res, err);
    });
};

const deleteAccount = async (req, res) => {};

// Middlewares

function compileContracts(req, res, next) {
  try {
    const contracts = req.files || req.files.files;

    const compiledFiles = compileFiles(contracts);

    req.compiledContract = compiledFiles;
    next();
  } catch (err) {
    logger.error(err);
    errorResp(res, err);
  }
}

function connectNetwork(req, res, next) {
  const { networkID } = req.params;
  logger.debug("connectNetwork : ", networkID);
  const currentWeb3 = new QuorumWeb3(networkID);
  currentWeb3
    .connect()
    .then(() => {
      logger.debug("connectNetwork connected");
      req.web3 = currentWeb3;
      next();
    })
    .catch((err) => {
      logger.error("connectNetwork :", err);
      errorResp(res, err);
    });
}

function checkAccountAndCreate(req, res, next) {
  const { short_id } = req.body;
  logger.debug("checkAccountAndCreate start");
  if (short_id) {
    ContractModel.where({
      short_id,
    })
      .fetch({
        columns: ["short_id", "owner_privatekey", "owner_address"],
        require: false,
      })
      .then((result) => {
        logger.debug("checkAccountAndCreate fetched :", result);
        req.accountDetail = {
          address: result.get("owner_address"),
          privateKey: crypto.decrypt(result.get("owner_privatekey")),
        };
        next();
      })
      .catch((err) => {
        logger.error("checkAccountAndCreate with shortID error :", err);
        errorResp(res, err);
      });
  } else {
    req.web3
      .newAccount()
      .then((account) => {
        logger.debug("checkAccountAndCreate newAccount :", account);
        req.accountDetail = {
          address: account.address,
          privateKey: account.privateKey,
        };
        next();
      })
      .catch((err) => {
        logger.error("checkAccountAndCreate without shortID error :", err);

        errorResp(res, err);
      });
  }
}

function deployContract(req, res, next) {
  const { args = [] } = req.body;
  logger.debug("deployContract start :", req.body);
  req.web3.addWallet(req.accountDetail.privateKey);
  req.web3
    .deploy(
      args,
      req.accountDetail.address,
      req.compiledContract.bytecode,
      req.compiledContract.abi
    )
    .then((contractAddress) => {
      logger.debug("deployContract deployed at :", contractAddress);
      req.contractAddress = contractAddress;
      next();
    })
    .catch((err) => {
      logger.error("deployContract :", err);
      errorResp(res, err);
    });
}

function insertContract(req, res, next) {
  const { short_id, name, description, application_id } = req.body;
  const { networkID } = req.params;
  const currentUserID = req.userData.uid;
  logger.debug("insertContract start :", req.body, req.params, currentUserID);
  if (short_id) {
    ContractModel.where({ short_id, is_deleted: false })
      .fetch({
        require: true,
      })
      .then(() => {
        logger.debug("insertContract contract with short_id exists");
        next();
      })
      .catch((err) => {
        logger.error("insertContract contract with short_id does not exist");
        errorResp(res, err);
      });
  } else {
    new ContractModel({
      name,
      description,
      short_id: createShortID(),
      owner_address: req.accountDetail.address,
      owner_privatekey: req.accountDetail.privateKey,
      application_id,
      network_id: networkID,
      owner_id: currentUserID,
    })
      .save()
      .then((createdContract) => {
        logger.debug("insertContract inserted :", createdContract.toJSON());
        req.createdContract = createdContract;
        next();
      })
      .catch((err) => {
        logger.error("insertContract ContractModel :", err);
        errorResp(res, err);
      });
  }
}

function versionHashControl(req, res, next) {
  const { short_id } = req.body;
  const contractHash = createHash(
    short_id || req.createdContract.get("short_id"),
    req.compiledContract.metadata
  );
  logger.debug("versionHashControl started :", contractHash);
  if (short_id) {
    ContractVersionModel.where({
      hash: contractHash,
    })
      .count()
      .then((total) => {
        logger.debug("versionHashControl count:", total);
        if (Number(total) === 0) {
          logger.debug("versionHashControl pass");
          req.versionHash = contractHash;
          next();
        } else {
          logger.error("versionHashControl : Same contract already exists");
          errorResp(res, new Error("Same contract already exists"));
        }
      })
      .catch((err) => {
        logger.error("versionHashControl ContractVersionModel count :", err);
        errorResp(res, err);
      });
  } else {
    req.versionHash = contractHash;
    next();
  }
}

function checkTagUniqueness(req, res, next) {
  const { short_id, tag } = req.body;
  logger.debug("checkTagUniqueness start:", short_id, tag, req.body);
  if (!(short_id && tag)) {
    logger.debug(
      "checkTagUniqueness first contract creation, tag and shortID is unique"
    );
    next();
  } else {
    ContractVersionModel.where({ short_id, tag })
      .count()
      .then((count) => {
        logger.debug("checkTagUniqueness count:", count);
        if (Number(count) === 0) {
          logger.debug("checkTagUniqueness tag is unique for the contract");
          next();
        } else {
          logger.error("checkTagUniqueness tag is not unique for the contract");
          errorResp(res, new Error("Same tag for the contract exists"));
        }
      })
      .catch((err) => {
        logger.error("checkTagUniqueness error :", err);
        errorResp(res, err);
      });
  }
}

function insertContractVersion(req, res) {
  const { name, description, tag, args, short_id } = req.body;
  const {
    compiledContract,
    contractAddress,
    versionHash,
    createdContract,
  } = req;
  logger.debug("insertContractVersion :", compiledContract, req.body);

  return new ContractVersionModel({
    abi: JSON.stringify(compiledContract.abi),
    bytecode: compiledContract.bytecode,
    metadata: compiledContract.metadata,
    name,
    description,
    args: typeof args === "string" ? args : JSON.stringify(args),
    hash: versionHash,
    tag,
    short_id: short_id || createdContract.get("short_id"),
    contract_address: contractAddress,
  })
    .save()
    .then((insertedContractVersion) => {
      logger.debug(
        "insertedContractVersion:",
        insertedContractVersion.toJSON()
      );
      successResp(
        res,
        {
          contract: createdContract && createdContract.toJSON(),
          contractVersion: insertedContractVersion.toJSON(),
          compiledMessages: compiledContract.compiledMessages,
        },
        "CREATED"
      );
    })
    .catch((err) => {
      logger.error("Deploy Contract Version Error: ", err);
      if (createdContract) {
        ContractModel.where({ id: createdContract.id }).destroy();
      }
      errorResp(res, new Error("Deploy Contract Version"));
    });
}

const router = Router();

router.use(fileUpload());

router.use("/:networkID/contract", ApplicationAuthMiddleware);

router
  .route("/:networkID/contract")
  .post(
    compileContracts,
    connectNetwork,
    checkAccountAndCreate,
    deployContract,
    insertContract,
    versionHashControl,
    checkTagUniqueness,
    insertContractVersion
  )
  .get(getMany);

router.use("/:networkID/contract/:shortID", ContractExistanceController);
router
  .route("/:networkID/contract/:shortID")
  .get(getContractDetail)
  .delete(deleteContract)
  .put(updateContract);

router.use(
  "/contract/:shortID/account/",
  ApplicationAuthMiddleware,
  ContractExistanceController
);

router.use(
  "/contract/:shortID/account/",
  ApplicationAuthMiddleware,
  ContractExistanceController
);
router
  .route("/contract/:shortID/account/")
  .get(getAccountList)
  .post(addAccount);

router.use(
  "/contract/:shortID/account/:id",
  ApplicationAuthMiddleware,
  ContractExistanceController
);
router
  .route("/contract/:shortID/account/:id")
  .get(getOneAccount)
  .put(updateAccount)
  .delete(deleteAccount);

export default router;
