/* eslint-disable camelcase */
/*
This controller controls whether the given contract exists or deleted,
responses error if the given contract does not exist


*/

// Utils
import { createLogger } from "../helpers/log";
import { errorResp } from "../helpers/http_util";

// Models
import ContractModel from "../models/contract";

const logger = createLogger("CONT_EXIST_SER");

const checkExist = (req, res, next) => {
  const shortIDToCheck =
    req.body.short_id || req.query.short_id || req.params.shortID;
  logger.debug("checkExist start :", shortIDToCheck);
  ContractModel.where({ short_id: shortIDToCheck, is_deleted: false })
    .fetch({ require: true })
    .then(() => {
      logger.debug("checkExist check : exists");
      next();
    })
    .catch((err) => {
      logger.error("checkExist fail : no such existing contract");
      errorResp(res, err);
    });
};

export default [checkExist];
