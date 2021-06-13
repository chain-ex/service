import db from "../../db";

const bookshelf = require("bookshelf")(db);

const ApiKey = bookshelf.model("ApiKey", {
  tableName: "api_keys",
});

export default ApiKey;
