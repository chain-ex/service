import { Router } from "express";

// Models
import UserModel from "../models/user";

// Helpers
import { successResp, errorResp } from "../helpers/http_util";
import { createLogger } from "../helpers/log";

const logger = createLogger("USR_SER");

/**
 * Get logged user data without password
 */
function meFunc(req, res) {
  const currentUserID = req.userData.uid;

  logger.debug("meFunc start:", currentUserID);
  UserModel.where({
    id: currentUserID,
  })
    .fetch({
      columns: ["username", "role", "name", "surname"],
    })
    .then((returnData) => {
      const user = returnData.toJSON();
      logger.debug("meFunc :", user);
      successResp(res, user);
    })
    .catch((err) => {
      logger.error("meFunc :", err);
      errorResp(res, err);
    });
}

/**
 * Create a new user
 */
const save = (req, res) => {
  const data = req.body;

  logger.debug("save start: ", data);

  UserModel.forge(data)
    .save()
    .then((returnData) => {
      const user = returnData.toJSON();
      logger.debug("save: ", user);
      successResp(res, user, "CREATED");
    })
    .catch((err) => {
      logger.error("save: ", err);
      errorResp(res, err);
    });
};

/**
 * Get a specific user by using username
 */
const getOne = (req, res) => {
  const { username } = req.params;

  logger.debug("getOne start: ", username);

  UserModel.where({ username })
    .fetch()
    .then((returnData) => {
      const user = returnData.toJSON();
      logger.debug("getOne: ", username);
      successResp(res, user);
    })
    .catch((err) => {
      logger.error("getOne :", err);
      errorResp(res, err);
    });
};

/**
 *  Update user data without email and password
 */
const update = (req, res) => {
  const { username } = req.params;
  const data = req.body;
  logger.debug("update start: ", username);

  delete data.email;
  delete data.password;

  UserModel.where({
    username,
  })
    .save(data, { method: "update" })
    .then((returnData) => {
      const updatedUser = returnData;
      logger.debug("update :", updatedUser);
      successResp(res, updatedUser);
    })
    .catch((err) => {
      logger.error("update :", err);
      errorResp(res, err);
    });
};

/**
 * Get all users with pagination
 */
const getMany = (req, res) => {
  const { page = 1, pageSize = 20 } = req.query;

  logger.debug("getMany :", page, pageSize);

  UserModel.fetchPage({ page, pageSize })
    .then((result) => {
      logger.debug(`getMany : `, result);
      successResp(res, result);
    })
    .catch((err) => {
      logger.error("getMany : ", err);
      errorResp(res, err);
    });
};

const router = Router();

router.route("/").get(getMany).post(save);

router.route("/me").get(meFunc);

router.route("/:username").get(getOne).put(update);

export default router;
