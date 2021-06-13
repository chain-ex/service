import db from "../../db";

const bookshelf = require("bookshelf")(db);

const Webhook = bookshelf.model("Webhook", {
  tableName: "webhooks",
});

export default Webhook;
