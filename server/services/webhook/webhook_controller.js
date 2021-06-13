import axios from "axios";
import moment from "moment";

import crudRoutes from "../../helpers/crud_routes";

// Models
import WebhookModel from "../../models/webhook";
import WebhookLogModel from "../../models/webhookLog";
import ContractModel from "../../models/contract";

import config from "../../../config";

const { CODE } = config;

function baseQuery(currentUserID, currentShortID) {
  this.whereIn("short_id", function () {
    this.select("short_id").from(ContractModel.tableName).where({
      owner_id: currentUserID,
    });
  }).andWhere("short_id", currentShortID);
}

const CrudRoutes = crudRoutes(WebhookModel, {
  postFunc: {
    validateFilters: (props, req, res) => {
      const currentUserID = req.userData.uid;
      const currentshortID = props.short_id;
      // eslint-disable-next-line no-restricted-globals
      if (!isNaN(currentUserID)) {
        props.short_id = currentshortID;
        return undefined;
      }
      res.statusCode = CODE.ERR;
      return new Error("Invalid parameters");
    },
  },
  getFunc: {
    initialFilters: (findQuery, req) => {
      const currentUserID = Number(req.userData.uid);

      findQuery.whereIn("short_id", function () {
        this.select("short_id").from(ContractModel.tableName).where({
          owner_id: currentUserID,
        });
      });
    },
  },
  getManyFunc: {
    initialFilters: (findQuery, req) => {
      const currentUserID = Number(req.userData.uid);
      const currentshortID = req.query.shortID;

      if (!currentshortID) {
        throw new Error("Invalid shortID parameters");
      }

      baseQuery.apply(findQuery, [currentUserID, currentshortID]);
    },
  },
  deleteFunc: {
    validateFilters: (findQuery, req) => {
      const currentUserID = req.userData.uid;
      const currentshortID = req.body.short_id;

      baseQuery.apply(findQuery, [currentUserID, currentshortID]);
    },
  },
  putFunc: {
    validateFilters: (updateQuery, req) => {
      const currentUserID = req.userData.uid;
      const currentshortID = req.body.short_id;

      baseQuery.apply(updateQuery, [currentUserID, currentshortID]);
    },
  },
});

async function checkAndSendWebhook(shortID, data) {
  if (data) {
    const sendingData = typeof data === "string" ? data : JSON.stringify(data);
    const results = await WebhookModel.findAll({
      filters: {
        short_id: shortID,
      },
    });
    const axiosPromises = [];
    for (const webhook of results) {
      const webhookLog = {
        webhook_id: webhook.id,
        short_id: shortID,
        url: webhook.url,
        authorization: webhook.authorization,
        request: {
          text: sendingData,
        },
        status: 404,
        request_at: moment(),
      };

      webhookLog.request = JSON.stringify(webhookLog.request);

      axiosPromises.push(
        axios
          .post(webhook.url, { text: sendingData })
          .then((response) => {
            const currentWebhook = {
              ...webhookLog,
            };
            currentWebhook.response_at = moment();
            currentWebhook.response =
              typeof response.data === "object"
                ? response.data
                : {
                    result: response.data,
                  };
            currentWebhook.status = response.status;
            WebhookLogModel.create(currentWebhook).catch((err) => {
              console.error(err);
            });
          })
          .catch((err) => {
            console.error(err);
            webhookLog.response_at = moment();
            WebhookLogModel.create(webhookLog).catch((err) => {
              console.error(err);
            });
          })
      );
    }

    await Promise.all(axiosPromises);
  }
}

const WebhookLogCrudRoutes = crudRoutes(WebhookLogModel, {
  getFunc: {
    initialFilters: (findQuery, req) => {
      const currentUserID = Number(req.userData.uid);

      findQuery.whereIn("short_id", function () {
        this.select("short_id").from(ContractModel.tableName).where({
          owner_id: currentUserID,
        });
      });
    },
  },
  getManyFunc: {
    initialFilters: (findQuery, req) => {
      const currentUserID = Number(req.userData.uid);
      const currentWebhookID = Number(req.params.id);

      findQuery
        .where({ webhook_id: currentWebhookID })
        .whereIn("short_id", function () {
          this.select("short_id").from(ContractModel.tableName).where({
            owner_id: currentUserID,
          });
        });
    },
  },
});

export default {
  ...CrudRoutes,
  webhookLogRoutes: {
    ...WebhookLogCrudRoutes,
  },
  checkAndSendWebhook,
};
