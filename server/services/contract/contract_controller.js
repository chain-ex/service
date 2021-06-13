import { v4 as uuidv4 } from "uuid";
import solc from "solc";
import Web3 from "web3";
import keccak256 from "keccak256";
import crudRoutes from "../../helpers/crud_routes";
import config from "../../../config";
import log4js from "../../helpers/log";

// Models
import ContractModel from "../../models/contract";
import contractAccountModel from "../../models/contractAccount";
import ContractVersionModel from "../../models/contractVersion";
import NetworkModel from "../../models/network";

const log = log4js.getLogger("contract");
const { CODE } = config;
const web3 = new Web3();

function compileFiles(files) {
  const sources = {};
  for (const key in files) {
    const file = files[key];
    sources[file.name] = {
      content: file.data.toString(),
    };
  }

  const input = {
    language: "Solidity",
    sources,
    settings: {
      outputSelection: {
        "*": {
          "*": ["metadata", "evm.bytecode", "abi"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    log.error(output.errors);
  }

  const firstContractFile = Object.keys(output.contracts)[0];
  const firstContract = Object.keys(output.contracts[firstContractFile])[0];

  const compiledContract = output.contracts[firstContractFile][firstContract];

  return {
    errors: output.errors,
    abi: compiledContract.abi,
    bytecode: `0x${compiledContract.evm.bytecode.object}`,
    metadata: compiledContract.metadata,
  };
}
async function checkIfContractExists(networkID, shortID) {
  const contracts = await ContractModel.findAll({
    filters: {
      network_id: networkID,
      short_id: shortID,
    },
  });
  if (contracts.length > 0) {
    return true;
  }
  return false;
}
const CrudRoutes = crudRoutes(ContractModel, {
  getFunc: {
    initialFilters: (findQuery, req) => {
      const currentUserID = Number(req.userData.uid);
      const { networkID } = req.params;

      findQuery.where({
        owner_id: currentUserID,
        network_id: networkID,
      });
    },
  },
  getManyFunc: {
    initialFilters: (findQuery, req) => {
      const currentUserID = Number(req.userData.uid);
      const applicationID = Number(req.query.app_id);
      const { networkID } = req.params;

      findQuery.where({
        owner_id: currentUserID,
        network_id: networkID,
      });

      if (applicationID) {
        findQuery.where({
          application_id: applicationID,
        });
      }
    },
  },
  deleteFunc: {
    validateFilters: (findQuery, req) => {
      const currentUserID = req.userData.uid;
      findQuery.where("owner_id", currentUserID);
    },
  },
  putFunc: {
    validateFilters: (updateQuery, req) => {
      const currentUserID = req.userData.uid;

      updateQuery.where({ owner_id: currentUserID });
    },
  },
});
const deployFunc = async (req, res, next) => {
  const props = req.body;

  const currentUserID = req.userData.uid;
  const { networkID } = req.params;

  if (typeof props.args === "string") {
    props.args = JSON.parse(props.args || "[]");
  }

  const { args = [] } = props;
  const contractArgs = {
    inputs: { args },
  };

  log.info("validateFilters ");
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(currentUserID)) {
    throw new Error("Invalid User");
  }

  // If contract files does not exist
  if (
    !req.files &&
    (!Array.isArray(req.files) || !Array.isArray(req.files.files))
  ) {
    throw new Error("Invalid Contract File or Files");
  }

  try {
    if (typeof req.files === "object" && Array.isArray(req.files.files)) {
      req.files = req.files.files;
    }
    const currentWeb3 = await NetworkModel.getWeb3(networkID);
    const accountCreate = currentWeb3.eth.accounts.create();
    const compiledContract = compileFiles(req.files);
    const newContract = new currentWeb3.eth.Contract(compiledContract.abi);
    currentWeb3.eth.accounts.wallet.add(accountCreate.privateKey);

    const receipt = await newContract
      .deploy({
        data: compiledContract.bytecode,
        arguments: args,
      })
      .send(
        {
          from: accountCreate.address,
          gas: 700000000,
        },
        function (error) {
          if (error) {
            log.error("CC - Error in deploying contract : ", error.message);
            throw error;
          }
        }
      )
      .on("error", function (error) {
        log.error(
          "CC - Error in deploying contract after sending : ",
          error.message
        );
        throw error;
      });
    const deployProps = {};
    deployProps.network_id = networkID;
    deployProps.name = props.name;
    deployProps.application_id = props.application_id;
    deployProps.description = props.description;
    deployProps.owner_id = currentUserID;
    deployProps.owner_address = accountCreate.address;
    deployProps.owner_privatekey = accountCreate.privateKey;
    const contractAddress = receipt._address;
    const [first, second] = uuidv4().split("-");
    const shortID = first + second;
    deployProps.short_id = shortID;
    const dataHash = keccak256(
      JSON.stringify(compiledContract.metadata) + JSON.stringify(contractArgs)
    ).toString("hex");
    ContractVersionModel.find({
      filters: {
        hash: dataHash,
      },
    })
      .then((sameHashRows) => {
        if (sameHashRows.length !== 0) {
          res.statusCode = CODE.ERR;
          res.json({
            message: `${ContractModel.name} already exists`,
          });
        } else {
          ContractModel.create(deployProps).then(([contractData]) => {
            ContractVersionModel.create({
              abi: JSON.stringify(compiledContract.abi),
              bytecode: compiledContract.bytecode,
              metadata: compiledContract.metadata,
              name: props.name,
              description: props.description,
              tag: "v1.0" || props.tag,
              args: contractArgs,
              hash: dataHash,
              short_id: shortID,
              contract_address: contractAddress,
            })
              .then(([versionReturn]) => {
                res.statusCode = CODE.CREATED;
                res.json({
                  message: `${ContractModel.name} created`,
                  data: { contractData, versionReturn },
                });
              })
              .catch((err) => {
                throw err;
              });
          });
        }
      })
      .catch((err) => {
        throw err;
      });
  } catch (err) {
    res.statusCode = CODE.ERR;
    next(err);
  }
};
const deployNewVersionFunc = async (req, res, next) => {
  const props = req.body;

  const currentUserID = req.userData.uid;
  const { networkID } = req.params;

  if (typeof props.args === "string") {
    props.args = JSON.parse(props.args || "[]");
  }

  const { args = [] } = props;
  const contractArgs = {
    inputs: { args },
  };

  log.info("validateFilters ");
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(currentUserID)) {
    throw new Error("Invalid User");
  }

  // If contract files does not exist
  if (
    !req.files &&
    (!Array.isArray(req.files) || !Array.isArray(req.files.files))
  ) {
    throw new Error("Invalid Contract File or Files");
  }

  try {
    if (typeof req.files === "object" && Array.isArray(req.files.files)) {
      req.files = req.files.files;
    }
    const currentWeb3 = await NetworkModel.getWeb3(networkID);
    const accountCreate = currentWeb3.eth.accounts.create();
    const compiledContract = compileFiles(req.files);
    const newContract = new currentWeb3.eth.Contract(compiledContract.abi);
    currentWeb3.eth.accounts.wallet.add(accountCreate.privateKey);

    const receipt = await newContract
      .deploy({
        data: compiledContract.bytecode,
        arguments: args,
      })
      .send(
        {
          from: accountCreate.address,
          gas: 700000000,
        },
        function (error) {
          if (error) {
            log.error("CC - Error in deploying contract : ", error.message);
            throw error;
          }
        }
      )
      .on("error", function (error) {
        log.error(
          "CC - Error in deploying contract after sending : ",
          error.message
        );
        throw error;
      });
    const deployProps = {};
    deployProps.network_id = networkID;
    deployProps.name = props.name;
    deployProps.description = props.description;
    deployProps.owner_id = currentUserID;
    deployProps.owner_address = accountCreate.address;
    deployProps.owner_privatekey = accountCreate.privateKey;
    const contractAddress = receipt._address;
    deployProps.short_id = req.params.shortID;
    const dataHash = keccak256(
      JSON.stringify(compiledContract.metadata) + JSON.stringify(contractArgs)
    ).toString("hex");
    ContractVersionModel.find({
      filters: {
        hash: dataHash,
      },
    })
      .then((sameHashRows) => {
        if (sameHashRows.length !== 0) {
          res.statusCode = CODE.ERR;
          res.json({
            message: `${ContractModel.name} already exists`,
          });
        } else {
          ContractModel.find({
            filters: {
              short_id: req.params.shortID,
            },
          }).then((shortIDContracts) => {
            if (shortIDContracts.length !== 0) {
              ContractVersionModel.create({
                abi: JSON.stringify(compiledContract.abi),
                bytecode: compiledContract.bytecode,
                metadata: compiledContract.metadata,
                name: props.name,
                description: props.description,
                tag: props.tag,
                args: contractArgs,
                hash: dataHash,
                short_id: req.params.shortID,
                contract_address: contractAddress,
              })
                .then(([versionReturn]) => {
                  res.statusCode = CODE.CREATED;
                  res.json({
                    message: `${ContractModel.name} created`,
                    data: { versionReturn },
                  });
                })
                .catch((err) => {
                  throw err;
                });
            } else {
              deployProps.application_id = shortIDContracts[0].application_id;
              ContractModel.create(deployProps)
                .then(([contractData]) => {
                  ContractVersionModel.create({
                    abi: JSON.stringify(compiledContract.abi),
                    bytecode: compiledContract.bytecode,
                    metadata: compiledContract.metadata,
                    name: props.name,
                    description: props.description,
                    tag: props.tag,
                    args: contractArgs,
                    hash: dataHash,
                    short_id: req.params.shortID,
                    contract_address: contractAddress,
                  })
                    .then(([versionReturn]) => {
                      res.statusCode = CODE.CREATED;
                      res.json({
                        message: `${ContractModel.name} created`,
                        data: { contractData, versionReturn },
                      });
                    })
                    .catch((err) => {
                      throw err;
                    });
                })
                .catch((err) => {
                  throw err;
                });
            }
          });
        }
      })
      .catch((err) => {
        throw err;
      });
  } catch (err) {
    res.statusCode = CODE.ERR;
    next(err);
  }
};
const getAllVersionsFunc = async (req, res, next) => {
  const { networkID, shortID } = req.params;
  checkIfContractExists(networkID, shortID)
    .then((contractExistance) => {
      if (contractExistance) {
        ContractVersionModel.getTable()
          .select()
          .where("short_id", shortID)
          .then((contractVersions) => {
            res.statusCode = CODE.OK;
            res.json({
              message: `${ContractModel.name}s found`,
              data: { contractVersions },
            });
          })
          .catch((err) => {
            throw err;
          });
      } else {
        throw new Error("Contract doesn't exist in the network");
      }
    })
    .catch((err) => {
      res.statusCode = CODE.ERR;
      next(err);
    });
};
const getLatestVersionFunc = async (req, res, next) => {
  const { networkID, shortID } = req.params;
  checkIfContractExists(networkID, shortID)
    .then((contractExistance) => {
      if (contractExistance) {
        ContractVersionModel.getTable()
          .select("*")
          .where("short_id", shortID)
          .orderBy("created_at", "desc")
          .then((contractVersion) => {
            const returnData = contractVersion[0];
            res.statusCode = CODE.OK;
            res.json({
              message: `${ContractModel.name} found`,
              data: returnData,
            });
          })
          .catch((err) => {
            throw err;
          });
      } else {
        throw new Error("Contract doesn't exist in the network");
      }
    })
    .catch((err) => {
      res.statusCode = CODE.ERR;
      next(err);
    });
};
const deleteLatestVersionFunc = async (req, res, next) => {
  const { networkID, shortID } = req.params;
  checkIfContractExists(networkID, shortID)
    .then((contractExistance) => {
      if (contractExistance) {
        ContractVersionModel.getTable()
          .select("*")
          .where("short_id", shortID)
          .orderBy("created_at", "desc")
          .then((contractVersion) => {
            if (!contractVersion) {
              throw new Error("Contract Version does not exist");
            }
            const returnData = contractVersion[0];
            ContractVersionModel.getTable()
              .where("id", returnData.id)
              .del()
              .then(() => {
                if (contractVersion.length === 1) {
                  ContractModel.getTable()
                    .where({
                      short_id: shortID,
                      created_at: returnData.created_at,
                    })
                    .del()
                    .then(() => {
                      res.statusCode = CODE.OK;
                      res.json({
                        message: `${ContractVersionModel.name} deleted`,
                      });
                    })
                    .catch((err) => {
                      throw err;
                    });
                } else {
                  res.statusCode = CODE.OK;
                  res.json({ message: `${ContractVersionModel.name} deleted` });
                }
              })
              .catch((err) => {
                throw err;
              });
          })
          .catch((err) => {
            throw err;
          });
      } else {
        throw new Error("Contract doesn't exist in the network");
      }
    })
    .catch((err) => {
      res.statusCode = CODE.ERR;
      next(err);
    });
};
const updateLatestVersionFunc = async (req, res, next) => {
  const { networkID, shortID } = req.params;
  const { name, description } = req.body;
  checkIfContractExists(networkID, shortID)
    .then((contractExistance) => {
      if (contractExistance) {
        ContractVersionModel.getTable()
          .select("*")
          .where("short_id", shortID)
          .orderBy("created_at", "desc")
          .then((contractVersion) => {
            if (!contractVersion) {
              throw new Error("Contract Version does not exists");
            }
            const returnData = contractVersion[0];
            ContractVersionModel.getTable()
              .where("id", returnData.id)
              .update({ name, description })
              .then(() => {
                if (contractVersion.length > 1) {
                  res.statusCode = CODE.OK;
                  res.json({
                    message: `${ContractVersionModel.name} updated`,
                  });
                } else {
                  ContractModel.getTable()
                    .where("short_id", shortID)
                    .update({ name, description })
                    .then(() => {
                      res.statusCode = CODE.OK;
                      res.json({
                        message: `${ContractVersionModel.name} updated`,
                      });
                    })
                    .catch((err) => {
                      throw err;
                    });
                }
              })
              .catch((err) => {
                throw err;
              });
          })
          .catch((err) => {
            throw err;
          });
      } else {
        throw new Error("Contract does not exist in the network");
      }
    })
    .catch((err) => {
      res.statusCode = CODE.ERR;
      next(err);
    });
};
const getContractWithTagFunc = async (req, res, next) => {
  const { networkID, shortID, tag } = req.params;
  checkIfContractExists(networkID, shortID)
    .then((contractExistance) => {
      if (contractExistance) {
        ContractVersionModel.find({
          filters: {
            short_id: shortID,
            tag,
          },
        })
          .then((contractWithTag) => {
            res.statusCode = CODE.OK;
            res.json({
              message: `${ContractVersionModel.name} found`,
              data: { contractWithTag },
            });
          })
          .catch((err) => {
            throw err;
          });
      } else {
        throw new Error("Contract doesn't exist in the network");
      }
    })
    .catch((err) => {
      res.statusCode = CODE.ERR;
      next(err);
    });
};
const deleteContractWithTagFunc = async (req, res, next) => {
  const { networkID, shortID, tag } = req.params;
  checkIfContractExists(networkID, shortID)
    .then((contractExistance) => {
      if (contractExistance) {
        ContractVersionModel.findAll({
          filters: {
            short_id: shortID,
          },
        }).then((shortIDVersions) => {
          if (shortIDVersions.length === 1) {
            ContractVersionModel.getTable()
              .where({ short_id: shortID, tag })
              .del()
              .then(() => {
                ContractModel.getTable()
                  .where({
                    network_id: networkID,
                    short_id: shortID,
                  })
                  .del()
                  .then(() => {
                    res.statusCode = CODE.OK;
                    res.json({
                      message: `${ContractVersionModel.name} deleted`,
                    });
                  })
                  .catch((err) => {
                    throw err;
                  });
              })
              .catch((err) => {
                throw err;
              });
          } else {
            ContractVersionModel.getTable()
              .where({ short_id: shortID, tag })
              .del()
              .then(() => {
                res.statusCode = CODE.OK;
                res.json({ message: `${ContractVersionModel.name} deleted` });
              })
              .catch((err) => {
                throw err;
              });
          }
        });
      } else {
        throw new Error("Contract doesn't exist in the network");
      }
    })
    .catch((err) => {
      res.statusCode = CODE.ERR;
      next(err);
    });
};
const updateContractWithTagFunc = async (req, res, next) => {
  const { networkID, shortID, tag } = req.params;
  checkIfContractExists(networkID, shortID)
    .then((contractExistance) => {
      if (contractExistance) {
        ContractVersionModel.getTable()
          .where({ short_id: shortID, tag })
          .update({
            name: req.body.name,
            description: req.body.description,
          })
          .then(() => {
            res.statusCode = CODE.OK;
            res.json({
              message: `${ContractVersionModel.name} updated`,
            });
          })
          .catch((err) => {
            throw err;
          });
      } else {
        throw new Error("Contract doesn't exist in the network");
      }
    })
    .catch((err) => {
      res.statusCode = CODE.ERR;
      next(err);
    });
};
// Contract Accounts
const contractAccountCrudRoutes = crudRoutes(contractAccountModel, {
  postFunc: {
    validateFilters: async (props, req, res) => {
      const currentUserID = req.userData.uid;
      const currentShortID = req.params.shortID;
      if (currentShortID && !Number.isNaN(currentUserID)) {
        if (await ContractModel.checkOwner(currentShortID, currentUserID)) {
          const accountCreate = web3.eth.accounts.create();

          props.short_id = currentShortID;
          props.address = accountCreate.address;
          props.private_key = accountCreate.privateKey;
          return undefined;
        }
        return new Error("Invalid user");
      }
      res.statusCode = CODE.ERR;
      return new Error("Invalid parameters");
    },
  },
  getFunc: {
    initialFilters: (findQuery, req) => {
      const currentUserID = Number(req.userData.uid);
      const { shortID } = req.params;

      findQuery
        .where({
          short_id: shortID,
        })
        .whereIn("short_id", function () {
          this.select("short_id").from(ContractModel.tableName).where({
            owner_id: currentUserID,
          });
        });
    },
  },
  getManyFunc: {
    initialFilters: (findQuery, req) => {
      const currentUserID = Number(req.userData.uid);
      const { shortID } = req.params;
      findQuery.whereIn("short_id", function () {
        this.select("short_id").from(ContractModel.tableName).where({
          owner_id: currentUserID,
          short_id: shortID,
        });
      });
    },
  },
  deleteFunc: {
    validateFilters: (findQuery, req) => {
      const currentUserID = req.userData.uid;
      const { shortID } = req.params;

      findQuery
        .where({
          short_id: shortID,
        })
        .whereIn("short_id", function () {
          this.select("short_id").from(ContractModel.tableName).where({
            owner_id: currentUserID,
          });
        });
    },
  },
  putFunc: {
    validateFilters: (updateQuery, req) => {
      const currentUserID = req.userData.uid;
      const { shortID } = req.params;

      updateQuery
        .where({
          short_id: shortID,
        })
        .whereIn("short_id", function () {
          this.select("short_id").from(ContractModel.tableName).where({
            owner_id: currentUserID,
          });
        });
    },
  },
});
export default {
  deployFunc,
  deployNewVersionFunc,
  getAllVersionsFunc,
  getLatestVersionFunc,
  deleteLatestVersionFunc,
  updateLatestVersionFunc,
  getContractWithTagFunc,
  deleteContractWithTagFunc,
  updateContractWithTagFunc,
  ...CrudRoutes,
  contractAccount: {
    ...contractAccountCrudRoutes,
  },
};
