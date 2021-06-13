import db from "../../db";

const bookshelf = require("bookshelf")(db);

const Network = bookshelf.model("Network", {
  tableName: "networks",
});

export default Network;
