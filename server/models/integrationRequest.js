import db from "../../db";

const bookshelf = require("bookshelf")(db);

const IntegrationRequest = bookshelf.model("IntegrationRequest", {
  tableName: "integration_requests",
});

export default IntegrationRequest;
