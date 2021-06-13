import db from "../../db";

const bookshelf = require("bookshelf")(db);

const ApplicationUser = bookshelf.model("ApplicationUser", {
  tableName: "application_users",
  applications() {
    return this.hasMany("Application", "applications");
  },
});

export default ApplicationUser;
