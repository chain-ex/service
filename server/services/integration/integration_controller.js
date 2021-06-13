import moment from "moment";
import config from "../../../config";
import crudRoutes from "../../helpers/crud_routes";

// Models
import ContractModel from "../../models/contract";
import TransactionModel from "../../models/transaction";
import IntegrationRequestModel from "../../models/integrationRequest";
import WebhookController from "../webhook/webhook_controller";

const { CODE } = config;

const CrudRoutes = crudRoutes(IntegrationRequestModel, {
  getFunc: {
    initialFilters: (findQuery, req) => {
      const currentUserID = Number(req.userData.uid);
      findQuery.where({
        user_id: currentUserID,
      });
    },
  },
  getManyFunc: {
    initialFilters: async (findQuery, req) => {
      const currentUserID = Number(req.userData.uid);
      const { networkID, applicationID, shortID } = req.query;

      if (networkID && !applicationID && !shortID) {
        const contracts = await ContractModel.find({
          filters: {
            network_id: parseInt(networkID, 10),
            owner_id: currentUserID,
          },
          selectableFields: ["short_id"],
          pageSize: 9999999,
        });
        const contractShortIDs = contracts.map((value) => value.short_id);
        findQuery.whereIn("short_id", contractShortIDs);
      }

      if (applicationID && !networkID && !shortID) {
        const contracts = await ContractModel.find({
          filters: {
            application_id: parseInt(applicationID, 10),
            owner_id: currentUserID,
          },
          selectableFields: ["short_id"],
          pageSize: 9999999,
        });
        const contractShortIDs = contracts.map((value) => value.short_id);
        findQuery.whereIn("short_id", contractShortIDs);
      }

      if (shortID) {
        findQuery.where({
          short_id: shortID,
        });
      }

      findQuery.where({
        user_id: currentUserID,
      });
    },
  },
});

const send = async (req, res, next) => {
  const currentUserID = req.userData.uid;
  const { shortID, method } = req.params;
  const { args = [], account } = req.body;
  try {
    const contractMethod = await ContractModel.contractMethod({
      userID: currentUserID,
      type: "send",
      shortID,
      account,
      method,
      args,
    }).catch((err) => {
      throw err;
    });

    const { cMethod, updateRequest } = await contractMethod();

    cMethod
      .on("receipt", async (receipt) => {
        // Create Transaction on DB
        await TransactionModel.create({
          user_id: currentUserID,
          short_id: shortID,
          hash: receipt.transactionHash,
          block_hash: receipt.blockHash,
          block_number: receipt.blockNumber,
          to_address: receipt.to,
          from_address: receipt.from,
          status: receipt.status,
          // Quorum Specs
          input: JSON.stringify(args),
          extra_data: JSON.stringify({
            gas_used: receipt.gasUsed,
            cumulative_gas_used: receipt.cumulativeGasUsed,
            events: receipt.events,
          }),
        })
          .then()
          .catch((error) => {
            throw error;
          });

        await WebhookController.checkAndSendWebhook(shortID, receipt.events);

        await updateRequest({
          events: JSON.stringify(receipt.events || {}),
          status: true,
        });

        res.statusCode = CODE.OK;
        res.send({
          data: receipt,
        });
      })
      .on("error", (err) => {
        updateRequest({
          status: false,
        })
          .then(() => {
            throw err;
          })
          .catch((updateErr) => {
            throw updateErr;
          });
      });
  } catch (err) {
    res.statusCode = CODE.ERR;
    next(err);
  }
};
const sendWithTag = async (req, res, next) => {
  const currentUserID = req.userData.uid;
  const { shortID, tag, method } = req.params;
  const { args = [], account } = req.body;

  try {
    const contractMethod = await ContractModel.contractMethod({
      userID: currentUserID,
      type: "send",
      shortID,
      account,
      tag,
      method,
      args,
    }).catch((err) => {
      throw err;
    });

    const { cMethod, updateRequest } = await contractMethod();

    cMethod
      .on("receipt", async (receipt) => {
        // Create Transaction on DB
        await TransactionModel.create({
          user_id: currentUserID,
          short_id: shortID,
          hash: receipt.transactionHash,
          block_hash: receipt.blockHash,
          block_number: receipt.blockNumber,
          to_address: receipt.to,
          from_address: receipt.from,
          status: receipt.status,
          // Quorum Specs
          input: JSON.stringify(args),
          extra_data: JSON.stringify({
            gas_used: receipt.gasUsed,
            cumulative_gas_used: receipt.cumulativeGasUsed,
            events: receipt.events,
          }),
        })
          .then()
          .catch((error) => {
            throw error;
          });

        await WebhookController.checkAndSendWebhook(shortID, receipt.events);

        await updateRequest({
          events: JSON.stringify(receipt.events || {}),
          status: true,
        });

        res.statusCode = CODE.OK;
        res.send({
          data: receipt,
        });
      })
      .on("error", (err) => {
        updateRequest({
          status: false,
        })
          .then(() => {
            throw err;
          })
          .catch((updateErr) => {
            throw updateErr;
          });
      });
  } catch (err) {
    res.statusCode = CODE.ERR;
    next(err);
  }
};

const call = async (req, res, next) => {
  const currentUserID = req.userData.uid;
  const { shortID, method } = req.params;
  const { args = [], account } = req.query;

  try {
    const contractMethod = await ContractModel.contractMethod({
      userID: currentUserID,
      type: "call",
      shortID,
      account,
      method,
      args,
    }).catch((err) => {
      throw err;
    });

    const { cMethod, updateRequest } = await contractMethod();

    cMethod
      .then(async (result) => {
        updateRequest({ outputs: JSON.stringify(result || []) });
        res.statusCode = CODE.OK;
        res.send({
          data: result,
        });
      })
      .catch((err) => {
        res.statusCode = CODE.ERR;
        next(err);
      });
  } catch (err) {
    res.statusCode = CODE.ERR;
    next(err);
  }
};
const callWithTag = async (req, res, next) => {
  const currentUserID = req.userData.uid;
  const { shortID, tag, method } = req.params;
  const { args = [], account } = req.query;
  try {
    const contractMethod = await ContractModel.contractMethod({
      userID: currentUserID,
      type: "call",
      shortID,
      tag,
      account,
      method,
      args,
    }).catch((err) => {
      throw err;
    });

    const { cMethod, updateRequest } = await contractMethod();

    cMethod
      .then(async (result) => {
        updateRequest({ outputs: JSON.stringify(result || []) });
        res.statusCode = CODE.OK;
        res.send({
          data: result,
        });
      })
      .catch((err) => {
        res.statusCode = CODE.ERR;
        next(err);
      });
  } catch (err) {
    res.statusCode = CODE.ERR;
    next(err);
  }
};

const stats = async (req, res, next) => {
  const currentUserID = req.userData.uid;
  const { shortID, applicationID } = req.query;
  try {
    let contractShortIDs;
    if (applicationID && !shortID) {
      const contracts = await ContractModel.find({
        filters: {
          application_id: parseInt(applicationID, 10),
          owner_id: currentUserID,
        },
        selectableFields: ["short_id"],
        pageSize: 9999999,
      });
      contractShortIDs = contracts.map((value) => value.short_id);
    }
    const getMainQuery = () => {
      const mainQuery = IntegrationRequestModel.getTable().select().where({
        user_id: currentUserID,
      });
      if (shortID && !applicationID) {
        mainQuery.andWhere({
          short_id: shortID,
        });
      }
      if (!shortID && applicationID) {
        mainQuery.whereIn("short_id", contractShortIDs);
      }
      return mainQuery;
    };

    const { todayTotal } = await getMainQuery()
      .andWhere("created_at", ">=", moment().format("YYYY-MM-DD"))
      .count("id", { as: "todayTotal" })
      .first()
      .then()
      .catch((err) => {
        throw err;
      });

    const { weekTotal } = await getMainQuery()
      .andWhere(
        "created_at",
        ">=",
        moment().startOf("week").format("YYYY-MM-DD")
      )
      .count("id", { as: "weekTotal" })
      .first()
      .then()
      .catch((err) => {
        throw err;
      });

    const { monthTotal } = await getMainQuery()
      .andWhere(
        "created_at",
        ">=",
        moment().startOf("month").format("YYYY-MM-DD")
      )
      .count("id", { as: "monthTotal" })
      .first()
      .then()
      .catch((err) => {
        throw err;
      });

    const { quarterTotal } = await getMainQuery()
      .andWhere(
        "created_at",
        ">",
        moment().startOf("quarter").format("YYYY-MM-DD")
      )
      .count("id", { as: "quarterTotal" })
      .first()
      .then()
      .catch((err) => {
        throw err;
      });

    const { yearTotal } = await getMainQuery()
      .andWhere(
        "created_at",
        ">=",
        moment().startOf("year").format("YYYY-MM-DD")
      )
      .count("id", { as: "yearTotal" })
      .first()
      .then()
      .catch((err) => {
        throw err;
      });

    res.statusCode = CODE.OK;
    res.send({
      data: {
        todayTotal: parseInt(todayTotal, 10),
        weekTotal: parseInt(weekTotal, 10),
        monthTotal: parseInt(monthTotal, 10),
        quarterTotal: parseInt(quarterTotal, 10),
        yearTotal: parseInt(yearTotal, 10),
      },
    });
  } catch (err) {
    res.statusCode = CODE.ERR;
    next(err);
  }
};

export default {
  send,
  sendWithTag,
  call,
  callWithTag,
  integrationRequestFuncs: {
    stats,
    ...CrudRoutes,
  },
};
