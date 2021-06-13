import db from "../../db";

const bookshelf = require("bookshelf")(db);

const Transaction = bookshelf.model("Transaction", {
  tableName: "transactions",
});

export default Transaction;
