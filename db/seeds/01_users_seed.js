import UserModel from "../../server/models/user";
import { createLogger } from "../../server/helpers/log";

const logger = createLogger("USR_SEED");

exports.seed = (knex) =>
  knex(new UserModel().tableName)
    .del()
    .then(() => [
      {
        name: "admin",
        surname: "tubu",
        username: "tubuadmin",
        password: "asdqwe1234",
        email: "admin@tubu.io",
        role: "user",
        is_verified: true,
      },
      {
        name: "tubu",
        surname: "tubu",
        username: "tububest",
        password: "asdqwe1234",
        email: "info@tubu.io",
        role: "user",
        is_verified: true,
      },
    ])
    .then((newUsers) =>
      Promise.all(newUsers.map((user) => new UserModel(user).save())).then(
        ([savedUser, savedUser2]) => {
          logger.info("OK : ", savedUser.get("username"));
          logger.info("OK : ", savedUser2.get("username"));
        }
      )
    )
    .catch((err) => logger.error(err));
