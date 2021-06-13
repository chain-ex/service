import NetworkModel from "../../server/models/network";
import UserModel from "../../server/models/user";
import { createLogger } from "../../server/helpers/log";

const logger = createLogger("NET_SEED");

exports.seed = (knex) =>
  knex(new NetworkModel().tableName)
    .del()
    .then(() =>
      UserModel.where({
        username: "tubuadmin",
      }).fetch()
    )
    .then((result) => {
      return result.id;
    })
    .then((userId) => [
      {
        owner_id: userId,
        name: "Test Quorum Network",
        bctype: "Quorum",
        version: "20.10.0",
        consensus: "raft",
        ip_address: "ec2-18-159-65-204.eu-central-1.compute.amazonaws.com",
        ws_port: "23000",
        is_public: true,
      },
      {
        owner_id: userId,
        name: "Istanbul Network",
        bctype: "Quorum",
        version: "21.1.0",
        consensus: "istanbul",
        ip_address: "3.64.73.235",
        ws_port: "23000",
        is_public: true,
      },
    ])
    .then((newNetworks) =>
      Promise.all(
        newNetworks.map((network) =>
          new NetworkModel(network).save().then((savedNetwork) => {
            logger.info("OK : ", savedNetwork.get("name"));
          })
        )
      )
    )
    .catch((err) => logger.error(err));
