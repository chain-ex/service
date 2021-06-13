import crypto from "../helpers/crypto";
import db from "../../db";

const bookshelf = require("bookshelf")(db);

const beforeSave = (contractAccount) => {
  contractAccount.private_key = crypto.encrypt(contractAccount.private_key);
};
const ContractAccount = bookshelf.model("ContractAccount", {
  initialize() {
    this.constructor.__super__.initialize.apply(this, arguments);

    this.on("creating", this.validateSave);
  },
  tableName: "contract_accounts",
  validateSave() {
    return beforeSave(this.attributes);
  },
});

export default ContractAccount;
