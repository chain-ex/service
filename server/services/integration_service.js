/* eslint-disable camelcase */
import { Router } from "express";
import cache from "../../db/cache";
// Blockchain
import QuorumWeb3 from "../blockchain/QuorumWeb3";
import Transaction from "../blockchain/Transaction";

// Models
import ContractModel from "../models/contract";
import ContractVersionModel from "../models/contractVersion";
import ApiKeyModel from "../models/apiKey";
import IntegrationRequestModel from "../models/integrationRequest";

// Helper Functions
import crypto from "../helpers/crypto";
import { createLogger } from "../helpers/log";
import { successResp, errorResp } from "../helpers/http_util";
import ContractAccount from "../models/contractAccount";

const web3List = [];
const web3ContractList = [];

cache.internalCache.on("expired", (key) => {
  delete web3List[key];
  delete web3ContractList[key];
});

const logger = createLogger("INT_SER");

function getVersionByTag(shortID, tag) {
  return ContractVersionModel.where({
    short_id: shortID,
    tag,
  })
    .fetch({
      columns: ["abi", "contract_address"],
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
      columns: ["tag", "abi", "contract_address"],
    })
    .then((result) => {
      return result.toJSON();
    });
}

const send = async (req, res) => {
  const { method, shortID } = req.params;
  const { args = [] } = req.body;
  const { account, web3, web3Contract } = req;
  const { contract_address } = req.version;

  logger.debug("send: ", method, shortID, args);

  try {
    const newTX = new Transaction(
      {
        short_id: shortID,
        to_address: contract_address,
        from_address: account.address,
        input: {
          args,
        },
      },
      {
        afterTransactionHash: (hash) => {
          // TODO: if app webhook, send event to webhook
          successResp(res, hash);
        },
      }
    );

    web3.addWallet(crypto.decrypt(account.privateKey));
    logger.debug("send try block started: ", method, account.address, args);

    web3Contract.send(method, account.address, args, newTX).catch((err) => {
      logger.error("send catch", err);
      errorResp(res, err);
    });
  } catch (err) {
    logger.error("send :", err);
    errorResp(res, err);
  }
};

const call = async (req, res) => {
  const { method } = req.params;
  const { args = [] } = req.query;
  const { account, web3, web3Contract } = req;
  let argsArray;
  logger.debug("call: ", method, args);
  if (!Array.isArray(args)) {
    argsArray = [args];
  } else {
    argsArray = args;
  }
  try {
    web3.addWallet(crypto.decrypt(account.privateKey));
    logger.debug(
      "call try block started: ",
      method,
      account.address,
      argsArray
    );
    web3Contract
      .call(method, account.address, argsArray)
      .then((result) => {
        logger.debug("call result: ", result);

        successResp(res, result);
      })
      .catch((err) => {
        logger.error("call catch", err);
      });
  } catch (err) {
    logger.error("call :", err);
    errorResp(res, err);
  }
};

const getPastEvents = async (req, res) => {
  const { eventName } = req.params;
  const { filter } = req.body;
  const { web3 } = req;
  const { abi, contract_address } = req.version;

  const instance = new web3.web3.eth.Contract(abi, contract_address);
  instance
    .getPastEvents(eventName, { filter })
    .then((events) => {
      successResp(res, events, "OK");
    })
    .catch((err) => {
      errorResp(res, err);
    });
};

const router = Router();

// Middleware
const controlContract = async (req, res, next) => {
  const { shortID, tag } = req.params;
  logger.debug("controlContract start:", req.params, tag);

  // cache control
  let cacheContract = await cache
    .get(`contract${shortID}${tag || ""}`)
    .catch((err) => {
      logger.error("controlContract cache:", err);
    });

  logger.debug("contractContract  cacheContract", Boolean(cacheContract));
  if (cacheContract) {
    if (typeof cacheContract === "string")
      cacheContract = JSON.parse(cacheContract);
    req.contract = cacheContract;
    req.version = await cache.get(`${shortID}${tag || ""}`).catch((err) => {
      logger.error("controlContract version get cache:", err);
    });

    if (typeof req.version === "string") req.version = JSON.parse(req.version);

    logger.debug("contractContract  cache", req.contract, req.version);
    next();
  } else {
    ContractModel.where({ short_id: shortID, is_deleted: false })
      .fetch({
        columns: [
          "owner_address",
          "owner_privatekey",
          "network_id",
          "application_id",
        ],
      })
      .then(async (contract) => {
        logger.debug("controlContract contract:", contract);
        req.contract = contract.toJSON();
        await cache
          .set(`contract${shortID}${tag || ""}`, req.contract)
          .catch((err) => {
            logger.error("controlContract set cache:", err);
          });
        if (tag) {
          getVersionByTag(shortID, tag).then(async (version) => {
            logger.debug("controlContract byTag: ", version);
            req.version = version;
            await cache
              .set(`${shortID}${tag || ""}`, req.version)
              .catch((err) => {
                logger.error("controlContract byTag set cache:", err);
              });
            next();
          });
        } else {
          getLatestVersion(shortID)
            .then(async (version) => {
              logger.debug("controlContract latest version: ", version);
              req.version = version;
              await cache.set(shortID, req.version).catch((err) => {
                logger.error("controlContract latest version set cache:", err);
              });
              next();
            })
            .catch((err) => {
              logger.error("Could not find the version");
              errorResp(res, err);
            });
        }
      })
      .catch((err) => {
        logger.error("controlContract :", err);
        errorResp(res, err);
      });
  }
};

const controlApiKey = async (req, res, next) => {
  const { ApiKey, apikey } = req.headers;
  const { shortID } = req.params;
  const token = ApiKey || apikey;
  logger.debug("controlApiKey start:", token, req.contract.application_id);

  const cachedApiKey = await cache
    .get(`apiKey${shortID}${token}`)
    .catch((err) => {
      logger.error("controlApiKey get cache:", err);
    });
  if (cachedApiKey) {
    next();
  } else {
    ApiKeyModel.where({
      token,
      application_id: req.contract.application_id,
    })
      .fetch()
      .then(() => {
        cache.set(`apiKey${shortID}${token}`, token).catch((err) => {
          logger.error("controlApiKey set cache:", err);
        });
        next();
      })
      .catch((err) => {
        logger.error("controlApiKey :", err);
        return errorResp(res, new Error("Invalid ApiKey"), "UNAUTHORIZED");
      });
  }
};

const controlNetwork = (req, res, next) => {
  const networkID = req.contract.network_id;

  // const cachedWeb3Status = cache.internalCache.get(`Web3-Network-${networkID}`);
  const cachedWeb3Status = false;
  logger.debug(
    "controlNetwork start:",
    networkID,
    "cachedWeb3",
    cachedWeb3Status
  );

  if (cachedWeb3Status) {
    const { abi, contract_address } = req.version;

    const cachedWeb3 = web3List[`Web3-Network-${networkID}`];
    req.web3 = cachedWeb3;

    const cachedWeb3ContractStatus = cache.internalCache.get(
      `Web3-Contract-${contract_address}`
    );

    if (cachedWeb3ContractStatus) {
      logger.debug("Web3 Contract Cached Used", contract_address);
      req.web3Contract = web3ContractList[`Web3-Contract-${contract_address}`];
    } else {
      req.web3Contract = cachedWeb3.getContract(abi, contract_address);
      web3ContractList[`Web3-Contract-${contract_address}`] = req.web3Contract;
    }
    logger.debug("Web3 Cached Used", networkID);
    next();
    return;
  }

  const currentWeb3 = new QuorumWeb3(networkID);

  currentWeb3
    .connect()
    .then(() => {
      const { abi, contract_address } = req.version;
      logger.debug(
        "controlNetwork web3 connected contract:",
        req.version.contract_address
      );
      req.web3 = currentWeb3;
      cache.internalCache.set(`Web3-Network-${networkID}`, true);

      web3List[`Web3-Network-${networkID}`] = currentWeb3;
      req.web3Contract = currentWeb3.getContract(abi, contract_address);
      web3ContractList[`Web3-Contract-${contract_address}`] = req.web3Contract;
      logger.debug(
        "controlNetwork web3Contract created: ",
        Boolean(req.web3Contract)
      );
      next();
    })
    .catch((err) => {
      logger.error("controlNetwork error: ", err);
      errorResp(res, err);
    });
};

const controlAccount = async (req, res, next) => {
  logger.debug("controlAccount start:", req.body.account);

  const account = req.body.account || req.query.account;
  const { owner_address, owner_privatekey } = req.contract;

  if (account) {
    const cachedAccount = await cache.get(`account-${account}`).catch((err) => {
      logger.error("controlAccount cachedAccount", err);
    });

    logger.debug("controlAccount cachedAccount:", cachedAccount);

    if (cachedAccount) {
      req.account = JSON.parse(cachedAccount);
      next();
    } else {
      ContractAccount.where({
        address: account,
      })
        .fetch()
        .then((dbAccount) => {
          logger.debug(
            "controlAccount account found:",
            dbAccount.get("address")
          );
          req.account = {
            privateKey: dbAccount.get("private_key"),
            address: dbAccount.get("address"),
          };
          cache.set(`account-${account}`, req.account).catch((err) => {
            logger.error("controlAccount set cachedAccount", err);
          });

          next();
        })
        .catch((err) => {
          logger.error("controlAccount error: ", err);
          errorResp(res, err);
        });
    }
  } else {
    logger.debug("controlAccount owner used");
    req.account = {
      privateKey: owner_privatekey,
      address: owner_address,
    };
    next();
  }
};

const scanRequestLog = (req, res, next) => {
  // Insert Log
  try {
    let returnData = {};
    const old = res.json.bind(res);
    res.json = (body) => {
      returnData = body;
      old(body);
    };

    const { shortID, method } = req.params;
    logger.debug("scanRequestLog :", req.params, req.method);
    let intReq;
    new IntegrationRequestModel({
      short_id: shortID,
      type: req.method === "GET" ? "call" : "send",
      method,
      inputs: {
        parameters: req.query || req.body,
      },
    })
      .save()
      .then((savedIntReq) => {
        logger.debug("scanRequestLog savedIntReq:", savedIntReq);
        intReq = savedIntReq;
        next();
      })
      .catch((err) => {
        logger.error("scanRequestLog insert:", err);
      });

    res.on("finish", () => {
      logger.debug("request finished, updating", returnData, res.statusCode);
      intReq
        .save(
          {
            status: res.statusCode === 200 || res.statusCode === 304,
            outputs: returnData,
          },
          { method: "update" }
        )
        .catch((err) => {
          logger.error("scanRequestLog update:", err);
        });
    });
  } catch (err) {
    logger.error(err);
  }
};

router
  .route("/events/:eventName/:shortID/:tag?")
  .post(
    controlContract,
    controlApiKey,
    controlNetwork,
    controlAccount,
    getPastEvents
  );
router
  .route("/:shortID/:method/:tag?")
  .get(
    controlContract,
    controlApiKey,
    controlNetwork,
    controlAccount,
    scanRequestLog,
    call
  );
router
  .route("/:shortID/:method/:tag?")
  .post(
    controlContract,
    controlApiKey,
    controlNetwork,
    controlAccount,
    scanRequestLog,
    send
  );

export default router;
