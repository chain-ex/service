import { Router } from "express";

// Models
import ApplicationModel from "../models/application";
import ApplicationUserModel from "../models/applicationUser";
import UserModel from "../models/user";

// Helper Functions
import { validate, body } from "../helpers/validation";
import { createLogger } from "../helpers/log";
import {
  successResp,
  successRespExtend,
  errorResp,
} from "../helpers/http_util";

const logger = createLogger("SHR_SER");
/**
 * search for the user with username like or email like
 */
const searchUser = async (req, res) => {
  const currentUserID = Number(req.userData.uid);
  const { email, username } = req.query;
  logger.debug("searchUser start, ", email, username, currentUserID);
  if (username) {
    UserModel.query(function (qb) {
      qb.where("username", "like", `%${username}%`);
      logger.debug("searchUser query: ", qb.toSQL().sql);
    })
      .fetchAll({
        columns: ["id", "username", "email"],
        required: false,
      })
      .then((result) => {
        logger.debug("searchUser users :", result);
        successResp(res, result);
      })
      .catch((err) => {
        logger.error("searchUser err :", err);
        errorResp(res, err);
      });
  } else if (email) {
    UserModel.query(function (qb) {
      qb.where("email", "LIKE", `%${email}%`);
      logger.debug("searchUser query: ", qb.toSQL().sql);
    })
      .fetchAll({
        columns: ["id", "username", "email"],
        required: false,
      })
      .then((result) => {
        logger.debug("searchUser users :", result);
        successResp(res, result);
      })
      .catch((err) => {
        logger.error("searchUser err :", err);
        errorResp(res, err);
      });
  } else {
    errorResp(res, new Error("No query parameters given"));
  }
};

/**
 * Get current user's shared contracts
 */
const getSharedMany = async (req, res) => {
  const currentUserID = Number(req.userData.uid);
  const { page = 1, pageSize = 20, networkID } = req.query;

  logger.debug("getSharedMany start: ", currentUserID, networkID, req.query);
  if (networkID) {
    ApplicationModel.query(function (qb) {
      qb.where({
        network_id: networkID,
      }).whereIn("id", function () {
        this.select("application_id")
          .from(new ApplicationUserModel().tableName)
          .where({
            user_id: currentUserID,
          });
      });
      logger.debug("getSharedMany query: ", qb.toSQL().sql);
    })
      .fetchPage({
        columns: ["id", "name", "description"],
        page,
        pageSize,
        required: true,
        withRelated: ["sharedWith"],
      })
      .then((result) => {
        logger.debug(`getSharedMany models: `, result.models);
        logger.debug(`getSharedMany pagination: `, result.pagination);
        successRespExtend(res, {
          data: result.models,
          pagination: result.pagination,
        });
      })
      .catch((err) => {
        logger.error(`getSharedMany : `, err);
        errorResp(res, err);
      });
  } else {
    errorResp(res, new Error("No networkID given"));
  }
};

/**
 * Share an application with other user
 */
const shareWith = async (req, res) => {
  logger.debug("shareWith: ", req.user, req.application);

  ApplicationUserModel.forge({
    user_id: req.user.id,
    application_id: req.application.id,
  })
    .save()
    .then((resp) => {
      logger.debug("shareWith: ", resp.toJSON());
      successResp(res);
    })
    .catch((err) => {
      errorResp(res, err);
    });
};

/**
 * Revoke an shared user from the app
 */
const revokeShare = async (req, res) => {
  logger.debug("revokeShare: ", req.user, req.application);

  ApplicationUserModel.where({
    user_id: req.user.id,
    application_id: req.application.id,
  })
    .destroy()
    .then(() => {
      logger.debug("revokeShare: ", req.user.email);
      successResp(res);
    })
    .catch((err) => {
      logger.error("revokeShare :", err);
      errorResp(res, err);
    });
};

// Controller Funcs
function controlApplication(req, res, next) {
  const currentUserID = Number(req.userData.uid);
  const { application_id } = req.body;

  // Application Constraint
  ApplicationModel.where({
    owner_id: currentUserID,
    id: application_id,
  })
    .fetch({ require: false })
    .then((application) => {
      logger.debug("controlApplication app fetched :", application);
      req.application = application.toJSON();
      next();
    })
    .catch(() => {
      logger.error("controlApplication : No Application");
      errorResp(res, new Error("No such application"));
    });
}

function controlUser(req, res, next) {
  const { email } = req.body;
  UserModel.where({
    email,
  })
    .fetch({ require: false })
    .then((user) => {
      if (Number(req.userData.uid) !== Number(user.toJSON().id)) {
        logger.debug(req.userData.uid, user.toJSON().id);
        logger.debug("controlUser user fetched :", user.toJSON());
        req.user = user.toJSON();
        next();
      } else {
        logger.error("controlUser sharing with current user is not allowed");
        errorResp(res, new Error("Sharing with current user is not allowed"));
      }
    })
    .catch(() => {
      logger.error("controlUser : No User");
      errorResp(res, new Error("No such user"));
    });
}

function controlSharing(req, res, next) {
  ApplicationUserModel.where({
    application_id: req.application.id,
    user_id: req.user.id,
  })
    .fetch({ require: false })
    .then((result) => {
      if (result) {
        logger.error("controlSharing sharing record fetched :", result);

        errorResp(res, new Error("Already Shared"));
      } else {
        logger.debug("controlSharing sharing record not found ");

        next();
      }
    })
    .catch((err) => {
      errorResp(res, err);
    });
}

function controlRevoking(req, res, next) {
  ApplicationUserModel.where({
    application_id: req.application.id,
    user_id: req.user.id,
  })
    .fetch({ require: false })
    .then((result) => {
      logger.debug("controlSharing sharing record fetched :", result);

      if (result) {
        next();
      } else {
        errorResp(res, new Error("Already Revoked"));
      }
    })
    .catch((err) => {
      logger.error("controlSharing sharing record not found ");

      errorResp(res, err);
    });
}

const router = Router();

router
  .route("/")
  .post(
    validate([
      body("email").isEmail().withMessage("Email is not correct format"),
    ]),
    controlApplication,
    controlUser,
    controlSharing,
    shareWith
  )
  .delete(
    validate([
      body("email").isEmail().withMessage("Email is not correct format"),
    ]),
    controlApplication,
    controlUser,
    controlRevoking,
    revokeShare
  );

router.route("/").get(getSharedMany);
router.route("/search").get(searchUser);
export default router;
