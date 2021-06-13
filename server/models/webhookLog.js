import db from "../../db";

const bookshelf = require("bookshelf")(db);

const WebhookLog = bookshelf.model("WebhookLog", {
  tableName: "webhook_logs",
});

export default WebhookLog;
