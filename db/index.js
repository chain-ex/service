import path from "path";
import config from "../config";

const client = require("knex")({
  client: "pg",
  connection: {
    ...config.dbConfig,
  },
  log: {
    warn(msg) {},
  },
  migrations: {
    directory: path.join(__dirname, "migrations/"),
    tableName: "migrations",
  },
  seeds: {
    directory: path.join(__dirname, "seeds/"),
  },
});

export default client;
