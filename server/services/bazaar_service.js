import { v4 as uuidv4 } from "uuid";
import keccak256 from "keccak256";
import { Router } from "express";
import QuorumWeb3 from "../blockchain/QuorumWeb3";

// Helpers
import {
  errorResp,
  successResp,
  successRespExtend,
} from "../helpers/http_util";

// Models
import ContractBazaarModel from "../models/bazaar";
import ContractModel from "../models/contract";
import ContractVersionModel from "../models/contractVersion";

import { createLogger } from "../helpers/log";

const logger = createLogger("BZR_SER");

function createShortID() {
  const [first, second, third] = uuidv4().split("-");
  return first + second + third;
}

function createHash(shortID, metadata) {
  return keccak256(shortID + JSON.stringify(metadata)).toString("hex");
}

function addToMarket(req, res) {
  const currentUserID = req.userData.uid;
  const {
    name,
    abi,
    bytecode,
    metadata,
    is_public,
    description,
    args,
  } = req.body;
  logger.debug("addToMarket start ", name);
  ContractBazaarModel.forge({
    abi,
    bytecode,
    metadata,
    name,
    is_public,
    description,
    owner_id: currentUserID,
    bazaar_version: "0.1.0",
  })
    .save()
    .then((bazaarContract) => {
      logger.debug("addToMarket forged ", bazaarContract);
      successResp(res, bazaarContract, "CREATED");
    })
    .catch((err) => {
      logger.error("addToMarket forge error :", err);
      errorResp(res, err);
    });
}

function listMarket(req, res) {
  const { page = 1, pageSize = 20 } = req.query;

  logger.debug("listMarket start");
  ContractBazaarModel.fetchPage({
    columns: ["id", "name", "description", "abi"],
    require: false,
    pageSize,
    page,
  })
    .then((result) => {
      logger.debug("listMarket listed :", result);
      result.models = result.models.map((returnModel) => {
        logger.debug("listMarket returnModel :", returnModel);
        const contract = returnModel.toJSON();
        logger.debug("listMarket returnModel contract :", contract);

        if (JSON.parse(contract.abi)[0].type === "constructor") {
          // eslint-disable-next-line prefer-destructuring
          contract.constructorParams = JSON.parse(contract.abi)[0];
          logger.debug(
            "listMarket constructorParams :",
            contract.constructorParams
          );
        } else {
          contract.constructorParams = null;
        }
        delete contract.abi;
        return contract;
      });

      successRespExtend(res, {
        data: result.models,
        pagination: result.pagination,
      });
    })
    .catch((err) => {
      logger.error("listMarket list error :", err);
      errorResp(res, err);
    });
}

function getMarketContract(req, res) {
  const { id } = req.params;
  logger.debug("getMarketContract start: ", id);
  ContractBazaarModel.where({ id })
    .fetch({
      require: false,
      columns: ["id", "abi", "name", "description", "is_public"],
    })
    .then((fetchedContract) => {
      fetchedContract = fetchedContract.toJSON();
      let constructorParams;
      if (JSON.parse(fetchedContract.abi)[0].type === "constructor") {
        [constructorParams] = JSON.parse(fetchedContract.abi);
      } else {
        constructorParams = null;
      }
      logger.debug("getMarketContract fetched :", fetchedContract);
      const returnData = { ...fetchedContract, constructorParams };
      successResp(res, returnData);
    })
    .catch((err) => {
      logger.error("getMarketContract error :", err);
      errorResp(res, err);
    });
}

function controlBazaarContract(req, res, next) {
  const { id } = req.params;
  logger.debug("controlBazaarContract start: ", id);
  ContractBazaarModel.where({ id })
    .fetch()
    .then((bazaarContract) => {
      logger.debug("controlBazaarContract: ", bazaarContract);
      req.bazaarContract = bazaarContract.toJSON();
      next();
    })
    .catch((err) => {
      logger.error("controlBazaarContract: ", err);
      errorResp(res, err);
    });
}

function controlNetwork(req, res, next) {
  const { network_id } = req.body;
  logger.debug("controlNetwork start: ", network_id);
  const newWeb3 = new QuorumWeb3(network_id);
  newWeb3
    .connect()
    .then(() => {
      req.web3 = newWeb3;
      logger.debug("controlNetwork OK");
      next();
    })
    .catch((err) => {
      logger.error("controlNetwork :", err);
      errorResp(res, err);
    });
}

function deployIntoNetwork(req, res, next) {
  const currentWeb3 = req.web3;
  const { args } = req.body;
  const { bytecode, abi } = req.bazaarContract;

  logger.debug("DeployIntoNetwork start: ", args);
  currentWeb3
    .newAccount()
    .then((newAccount) => {
      req.newAccount = newAccount;
      currentWeb3.addWallet(newAccount.privateKey);
      currentWeb3
        .deploy(args, newAccount.address, bytecode, JSON.parse(abi))
        .then((contractAddress) => {
          req.contractAddress = contractAddress;
          logger.debug("DeployIntoNetwork: ", req.contractAddress);
          next();
        })
        .catch((err) => {
          logger.error("DeployIntoNetwork deploy :", err);
          errorResp(res, err);
        });
    })
    .catch((err) => {
      logger.error("DeployIntoNetwork newAccount:", err);
      errorResp(res, err);
    });
}

function addNewContract(req, res) {
  const { name, description, network_id, application_id } = req.body;
  const currentUserID = req.userData.uid;
  const { contractAddress } = req;
  const short_id = createShortID();
  logger.debug("addNewContract start: ", network_id);

  ContractModel.forge({
    name,
    description,
    network_id,
    application_id,
    owner_id: currentUserID,
    short_id,
    owner_address: req.newAccount.address,
    owner_privatekey: req.newAccount.privateKey,
  })
    .save()
    .then((savedContract) => {
      logger.debug("addNewContract savedContract: ", savedContract);

      const createdHash = createHash(short_id, req.bazaarContract.metadata);
      ContractVersionModel.forge({
        name,
        description,
        tag: req.body.tag,
        abi: req.bazaarContract.abi,
        bytecode: req.bazaarContract.bytecode,
        metadata: req.bazaarContract.metadata,
        args: req.body.args,
        hash: createdHash,
        short_id,
        contract_address: req.contractAddress,
      })
        .save()
        .then((savedContractVersion) => {
          logger.debug(
            "addNewContract savedContractVersion: ",
            savedContractVersion
          );

          successResp(
            res,
            {
              contract: savedContract.toJSON(),
              contractVersion: savedContractVersion.toJSON(),
            },
            "CREATED"
          );
        })
        .catch((err) => {
          savedContract.destroy();
          logger.error("addNewContract insertContractVersion: ", err);
          errorResp(res, err);
        });
    })
    .catch((err) => {
      logger.error("addNewContract insertContract:", err);
      errorResp(res, err);
    });
}

const router = Router();

router.route("/").get(listMarket);
router.route("/").post(addToMarket);

router
  .route("/:id")
  .post(
    controlBazaarContract,
    controlNetwork,
    deployIntoNetwork,
    addNewContract
  );

router.route("/:id").get(getMarketContract);

export default router;
