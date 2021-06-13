import db from "../../db";

const bookshelf = require("bookshelf")(db);

const Audit = bookshelf.model("Audit", {
  tableName: "audits",
});

export default Audit;
