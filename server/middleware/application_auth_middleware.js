/*
This middleware controls and 
returns available applications of current user as id array

> req.availableApps

*/

// Utils
import { createLogger } from "../helpers/log";
import { errorResp } from "../helpers/http_util";

// Models
import ApplicationUserModel from "../models/applicationUser";
import ApplicationModel from "../models/application";

const logger = createLogger("APP_AUTH_SER");

const checkExistingApps = (req, res, next) => {
  req.existingApps = [];
  logger.debug("checkExistingApps start");

  ApplicationModel.where({ is_deleted: false })
    .fetchAll({
      columns: ["id"],
    })
    .then((existingApps) => {
      const list = existingApps.map((existingApp) => existingApp.id);
      logger.debug("checkExistingApps found", list);
      req.existingApps = [...list];
      next();
    })
    .catch((err) => {
      logger.error("checkExistingApps err", err);
      errorResp(res, err);
    });
};

const checkShared = (req, res, next) => {
  const currentUserID = req.userData.uid;
  req.availableApps = [];
  logger.debug("checkShared start:", currentUserID);
  ApplicationUserModel.query(function queryBuilder(qb) {
    qb.where({
      user_id: currentUserID,
    })
      .whereIn("application_id", req.existingApps)
      .then((AppUserList) => {
        logger.debug("checkShared appUserList :", AppUserList);
        const list = AppUserList.map((AppUser) => AppUser.application_id);
        req.availableApps = [...list];
        delete req.existingApps;
        logger.debug("checkShared fetched:", req.availableApps);
        next();
      })
      .catch((err) => {
        logger.error("checkShared error:", err);
        errorResp(res, err);
      });
  });
};

const checkOwned = (req, res, next) => {
  const currentUserID = req.userData.uid;
  logger.debug("checkOwned start: ", currentUserID);
  ApplicationModel.where({
    is_deleted: false,
    owner_id: currentUserID,
  })
    .fetchAll({
      columns: ["id"],
      require: false,
    })
    .then((ownedAppList) => {
      const list = ownedAppList.map((app) => app.id);
      req.availableApps = [...req.availableApps, ...list];
      logger.debug("checkOwned fetched: ", req.availableApps);
      next();
    })
    .catch((err) => {
      logger.error("checkOwned error: ", err);
      errorResp(res, err);
    });
};

const checkAvailability = (req, res, next) => {
  if (req.availableApps.length) {
    logger.debug("APP_AUTH Done correctly");
    next();
  } else {
    errorResp(res, "No Auth Application");
  }
};
export default [checkExistingApps, checkShared, checkOwned, checkAvailability];
