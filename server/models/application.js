import db from "../../db";
import User from "./user";
import ApplicationUser from "./applicationUser";

const bookshelf = require("bookshelf")(db);

const Application = bookshelf.model("Application", {
  tableName: "applications",
  sharedWith() {
    return this.belongsToMany(User)
      .through(ApplicationUser, "application_id")
      .query(function queryBuilder(qb) {
        qb.select(["username", "email"]);
      });
  },
  owner() {
    return this.belongsTo(User, "owner_id", "id");
  },
});

export default Application;
