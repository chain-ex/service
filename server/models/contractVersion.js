import db from "../../db";

const bookshelf = require("bookshelf")(db);

const ContractVersion = bookshelf.model("ContractVersion", {
  tableName: "contract_version",
});

export default ContractVersion;
