import ApplicationModel from "../../server/models/application";
import NetworkModel from "../../server/models/network";
import ApplicationUserModel from "../../server/models/applicationUser";
import UserModel from "../../server/models/user";
import { createLogger } from "../../server/helpers/log";

const logger = createLogger("APP_SEED");

exports.seed = (knex) =>
  knex(new ApplicationModel().tableName)
    .del()
    .then(() =>
      UserModel.where({
        username: "tubuadmin",
      }).fetch()
    )
    .then((result) => {
      return result.id;
    })
    .then((userId) =>
      NetworkModel.where({
        ip_address: "18.159.65.204",
      })
        .fetch()
        .then((result) => {
          return { networkId: result.id, userId };
        })
    )
    .then(({ userId, networkId }) =>
      new ApplicationModel({
        name: "adminApplication",
        description: "sharedAppDesc",
        network_id: networkId,
        owner_id: userId,
        is_deleted: false,
      }).save()
    )
    .then((savedApp) =>
      UserModel.where({
        username: "tububest",
      })
        .fetch()
        .then((result) => {
          return new ApplicationUserModel({
            application_id: savedApp.id,
            user_id: result.id,
          })
            .save()
            .then((sharedApp) => {
              logger.info(
                "OK : ",
                sharedApp.get("application_id"),
                "shared with",
                sharedApp.get("user_id")
              );
            });
        })
    )
    .catch((err) => logger.error(err));
