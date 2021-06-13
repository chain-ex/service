import db from "../../db";

const bookshelf = require("bookshelf")(db);

const Contract = bookshelf.model("Contract", {
  tableName: "contract_bazaar",
});

export default Contract;
