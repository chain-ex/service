import { Router } from "express";

// Middlewares
import ApplicationAuthMiddleware from "../middleware/application_auth_middleware";

// Models
import ApplicationModel from "../models/application";
import ContractModel from "../models/contract";

// Helper Functions
import { validate, body } from "../helpers/validation";
import { createLogger } from "../helpers/log";
import {
  successResp,
  successRespExtend,
  errorResp,
} from "../helpers/http_util";

const logger = createLogger("APP_SER");

/**
 * Create a new application
 */
const save = (req, res) => {
  const currentUserID = req.userData.uid;
  const currentNetworkID = req.params.networkID;

  // New Application Data
  const data = req.body;

  data.owner_id = Number(currentUserID);
  data.network_id = Number(currentNetworkID);

  logger.debug("save start : ", data);

  ApplicationModel.forge(data)
    .save()
    .then((insertedData) => {
      const returnData = insertedData.pick([
        "id",
        "name",
        "description",
        "created_at",
      ]);
      logger.debug("save :", returnData);
      successResp(res, returnData, "CREATED");
    })
    .catch((err) => {
      logger.error("save ", err);
      errorResp(res, err);
    });
};

/**
 *  Get active user's applications with pagination
 */
const getMany = async (req, res) => {
  const currentUserID = Number(req.userData.uid);
  const { networkID } = req.params;
  const { page = 1, pageSize = 20 } = req.query;

  logger.debug(`getMany Start : `, networkID, page, pageSize);

  ApplicationModel.query(function queryBuilder(qb) {
    qb.where({
      network_id: Number(networkID),
      owner_id: Number(currentUserID),
    }).whereIn("id", req.availableApps);
  })
    .fetchPage({
      require: false,
      pageSize,
      page,
      columns: ["id", "name", "description"],
      withRelated: ["sharedWith"],
    })
    .then((result) => {
      logger.debug(`getMany : `, result);

      successRespExtend(res, {
        data: result.models,
        pagination: result.pagination,
      });
    })
    .catch((err) => {
      logger.error(`getMany `, err);
      errorResp(res, err);
    });
};

/**
 *  Get specific application by using id
 */
const getOne = async (req, res) => {
  const { networkID, id } = req.params;

  logger.debug(`get start: ${id}`);

  ApplicationModel.query(function queryBuilder(qb) {
    qb.where({ network_id: Number(networkID), id: Number(id) }).whereIn(
      "id",
      req.availableApps
    );
  })
    .fetch({
      columns: ["id", "name", "description", "created_at", "updated_at"],
      withRelated: ["sharedWith", "owner"],
    })
    .then((foundData) => {
      foundData.related("owner");
      const returnData = foundData.toJSON();
      logger.debug(`get ${id} :`, foundData);
      successResp(res, returnData);
    })
    .catch((err) => {
      logger.error(`Query Error Application(${id}) : ${err.message}`);
      errorResp(res, err);
    });
};

/**
 *
 * @param {number} appID the application id to search contracts in iy
 */
function getContractsInApp(appID) {
  logger.debug("getContractsInApp start :", appID);
  return ContractModel.where({
    application_id: appID,
  })
    .fetchAll({
      columns: ["short_id"],
      require: false,
    })
    .then((applicationContracts) => {
      const contractList = applicationContracts.map((contract) =>
        contract.get("short_id")
      );
      logger.debug("getContractsInApp fetched :", contractList);
      return contractList;
    })
    .catch((err) => {
      logger.error("getContractsInApp error: ", err);
    });
}
function deleteContractsInApp(contractList) {
  logger.debug("deleteContractsInApp started :", contractList);
  return ContractModel.query(function queryBuilder(qb) {
    qb.whereIn("short_id", contractList);
  })
    .save(
      {
        is_deleted: true,
      },
      { method: "update" }
    )
    .then((deletedContract) => {
      logger.debug(
        "deleteContractsInApp ran :",
        deletedContract.get("is_deleted")
      );
    })
    .catch((err) => {
      logger.error("deleteContractsInApp err :", err);
    });
}
/**
 *  Delete active user's selected applications with id
 */
const remove = async (req, res) => {
  const { networkID, id } = req.params;

  getContractsInApp(id).then((contractList) => {
    deleteContractsInApp(contractList)
      .then(() => {
        ApplicationModel.query(function queryBuilder(qb) {
          qb.where({
            network_id: Number(networkID),
            id,
          }).whereIn("id", req.availableApps);
        })
          .destroy()
          .then(() => {
            logger.debug(`remove ${id}`);
            successResp(res);
          })
          .catch((err) => {
            logger.error(`remove ${id} `, err);
            errorResp(res, err);
          });
      })
      .catch((err) => {
        errorResp(res, err);
      });
  });
  // Delete Query
};

/**
 *  Update active user's selected applications with id
 */
const update = async (req, res) => {
  const { networkID, id } = req.params;
  const data = req.body;

  logger.debug(`update ${id} :`, data);

  delete data.owner_id;
  delete data.network_id;

  // Update Query
  ApplicationModel.query(function queryBuilder(qb) {
    qb.where({
      network_id: Number(networkID),
      id,
    }).whereIn("id", req.availableApps);
  })
    .save(data, { method: "update" })
    .then((updatedData) => {
      logger.debug(`update ${id} : `, updatedData);
      successResp(res, updatedData);
    })
    .catch((err) => {
      logger.error(`update ${id} `, err);
      errorResp(res, err);
    });
};

const router = Router();

router
  .route("/:networkID/apps")
  .post(
    validate([
      body("name")
        .notEmpty()
        .isLength({ max: 150 })
        .withMessage("Name must not be empty or longer than 150 chars"),
      body("description")
        .notEmpty()
        .isLength({ max: 250 })
        .withMessage("Description must not be empty or longer than 250 chars"),
    ]),
    save
  )
  .get(ApplicationAuthMiddleware, getMany);

router.use("/:networkID/apps/:id", ApplicationAuthMiddleware);

router.route("/:networkID/apps/:id").get(getOne).put(update).delete(remove);

export default router;
