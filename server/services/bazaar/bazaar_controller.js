/* eslint-disable camelcase */
import { v4 as uuidv4 } from "uuid";
import keccak256 from "keccak256";

import crudRoutes from "../../helpers/crud_routes";
import BazaarModel from "../../models/bazaar";
import ContractModel from "../../models/contract";
import ContractVersionModel from "../../models/contractVersion";
import NetworkModel from "../../models/network";

// Log
import log4js from "../../helpers/log";

import config from "../../../config";

const logger = log4js.getLogger();
const { CODE } = config;

const CrudRoutes = crudRoutes(BazaarModel, {
  postFunc: {
    validateFilters: async (props, req, res) => {
      const currentUserID = req.userData.uid;
      const networkID = Number(props.networkID);

      if (typeof props.args === "string") {
        props.args = JSON.parse(props.args.replace(/\n/g, "") || "[]");
      }

      const { args = [] } = props;
      const contractArgs = {
        inputs: { args },
      };
      // eslint-disable-next-line no-restricted-globals
      if (isNaN(currentUserID)) {
        res.statusCode = CODE.ERR;
        return new Error("Invalid User");
      }

      if (
        !req.files &&
        (!Array.isArray(req.files) || !Array.isArray(req.files.files))
      ) {
        res.statusCode = CODE.ERR;
        return new Error("Invalid Contract File or Files");
      }
      try {
        if (typeof req.files === "object" && Array.isArray(req.files.files)) {
          req.files = req.files.files;
        }

        const currentWeb3 = await NetworkModel.getWeb3(networkID);
        const accountCreate = currentWeb3.eth.accounts.create();
        const newContract = new currentWeb3.eth.Contract(JSON.parse(props.abi));
        currentWeb3.eth.accounts.wallet.add(accountCreate.privateKey);

        const receipt = await newContract
          .deploy({
            data: props.bytecode,
            arguments: args,
          })
          .send({
            from: accountCreate.address,
            gas: 700000000,
          });
        delete props.networkID;
        delete props.applicationID;
        delete props.args;
        props.owner_id = currentUserID;
        props.bazaar_version = "0.1.0";
        return undefined;
      } catch (err) {
        res.statusCode = CODE.ERR;
        return err;
      }
    },
  },
  getFunc: {
    initialFilters: (findQuery, req) => {
      const currentUserID = Number(req.userData.uid);
      const reqid = Number(req.params.id);
      findQuery
        .where({
          owner_id: currentUserID,
          id: reqid,
        })
        .orWhere({
          is_public: true,
          id: reqid,
        });
    },
  },
});
const getBazaarFunc = async (req, res, next) => {
  const currentUserID = Number(req.userData.uid);
  const editedContracts = [];
  BazaarModel.getTable()
    .select()
    .where("owner_id", currentUserID)
    .orWhere("is_public", true)
    .then((bazaarContracts) => {
      let constructorParams;
      for (let i = 0; i < bazaarContracts.length; i += 1) {
        // eslint-disable-next-line camelcase
        const { id, abi, name, description, is_public } = bazaarContracts[i];
        logger.debug("Contract Detail ", id, abi, name, description, is_public);
        if (JSON.parse(abi)[0].type === "constructor") {
          [constructorParams] = JSON.parse(abi);
        } else {
          constructorParams = null;
        }
        editedContracts.push({
          id,
          constructorParams,
          name,
          description,
          is_public,
        });
      }
      res.statusCode = CODE.OK;
      res.json({
        message: `${BazaarModel.name} found`,
        data: editedContracts,
      });
    })
    .catch((err) => {
      res.statusCode = CODE.ERR;
      next(err);
    });
};
const getBazaarWithIDFunc = async (req, res, next) => {
  const currentUserID = Number(req.userData.uid);
  const reqID = Number(req.params.id);
  BazaarModel.getTable()
    .select()
    .where({
      owner_id: currentUserID,
      id: reqID,
    })
    .orWhere({
      id: reqID,
      is_public: true,
    })
    .then((bazaarContract) => {
      // eslint-disable-next-line camelcase
      const [{ id, abi, name, description, is_public }] = bazaarContract;
      logger.debug("Test");
      let constructorParams;
      if (JSON.parse(abi)[0].type === "constructor") {
        [constructorParams] = JSON.parse(abi);
      } else {
        constructorParams = null;
      }
      res.statusCode = CODE.OK;
      res.json({
        message: `${BazaarModel.name} found`,
        data: {
          id,
          constructorParams,
          name,
          description,
          is_public,
        },
      });
    })
    .catch((err) => {
      res.statusCode = CODE.ERR;
      next(err);
    });
};
const deployFromMarketFunc = async (req, res, next) => {
  const currentUserID = Number(req.userData.uid);
  const { id } = req.params;
  const { name, description, tag, network_id, application_id } = req.body;

  logger.debug(`Contract Deploy From market with`, req.body);

  try {
    if (typeof req.body.args === "string") {
      logger.debug("Contract Args Will be Converted into JSON");
      req.body.args = JSON.parse(req.body.args || "[]");
      logger.debug("Contract Args Converted into JSON");
    }
    const { args = [] } = req.body;
    const contractArgs = {
      inputs: { args },
    };
    // Deploy!!!
    const currentBazaarContract = await BazaarModel.getTable()
      .select(["abi", "bytecode", "metadata"])
      .where("id", id)
      .first()
      .then()
      .catch((err) => {
        throw err;
      });

    if (!currentBazaarContract) {
      logger.error("Bazaar Contract does not exist");
      throw new Error("Bazaar Contract does not exist");
    }

    const { abi, bytecode, metadata } = currentBazaarContract;

    logger.debug(`Web3 connection to network ${network_id}`);
    const currentWeb3 = await NetworkModel.getWeb3(Number(network_id));

    logger.debug(`Web3 connected to network ${network_id}`);

    const accountCreate = currentWeb3.eth.accounts.create();
    logger.debug(
      `New Account Created for new contract : ${accountCreate.address}`
    );

    const newContract = new currentWeb3.eth.Contract(JSON.parse(abi));
    logger.debug(`New Account Object Generated`);
    currentWeb3.eth.accounts.wallet.add(accountCreate.privateKey);

    const receipt = await newContract
      .deploy({
        data: bytecode,
        arguments: args,
      })
      .send(
        {
          from: accountCreate.address,
          gas: 700000000,
        },
        function (error) {
          if (error) {
            logger.error("CC - Error in deploying contract : ", error.message);
            throw error;
          }
        }
      )
      .catch((err) => {
        throw err;
      });

    const contractAddress = receipt._address;
    logger.debug(
      `New Contract Deployed on this Contract Address ${contractAddress}`
    );

    const dataHash = keccak256(
      JSON.stringify(metadata) + JSON.stringify(contractArgs)
    ).toString("hex");

    logger.debug(`New Contract Version Hash ${dataHash}`);

    const [first, second] = uuidv4().split("-");
    const shortID = first + second;
    logger.debug(`New Contract SHORT_ID : ${shortID}`);

    const sameHashRows = await ContractVersionModel.find({
      filters: {
        hash: dataHash,
      },
    }).catch((err) => {
      throw err;
    });

    if (sameHashRows.length !== 0) {
      const errMsg = `${ContractModel.name} already exists`;
      logger.error(errMsg);
      res.statusCode = CODE.ERR;
      next(new Error(errMsg));
    } else {
      const deployProps = {};
      deployProps.network_id = network_id;
      deployProps.name = name;
      deployProps.application_id = application_id;
      deployProps.description = description;
      deployProps.owner_id = currentUserID;
      deployProps.owner_address = accountCreate.address;
      deployProps.owner_privatekey = accountCreate.privateKey;
      deployProps.short_id = shortID;

      logger.debug(`New Contract Model Added with`, deployProps);
      const [contractData] = await ContractModel.create(deployProps).catch(
        (err) => {
          throw err;
        }
      );

      const [versionReturn] = await ContractVersionModel.create({
        abi,
        bytecode,
        metadata,
        name,
        description,
        tag: "v1.0" || tag,
        args: contractArgs,
        hash: dataHash,
        short_id: shortID,
        contract_address: contractAddress,
      }).catch((err) => {
        throw err;
      });

      res.statusCode = CODE.CREATED;
      res.json({
        message: `${ContractModel.name} created`,
        data: {
          contractData,
          versionReturn,
        },
      });
    }
  } catch (err) {
    res.statusCode = CODE.ERR;
    next(err);
  }
};

export default {
  getBazaarFunc,
  getBazaarWithIDFunc,
  deployFromMarketFunc,
  ...CrudRoutes,
};
