import bcrypt from "bcrypt";
import db from "../../db";
import config from "../../config";

const SALT_ROUNDS = config.saltingRounds;
const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);
const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

const beforeSave = (user) => {
  if (!user.password) return Promise.resolve(user);

  // `password` will always be hashed before being saved.
  return hashPassword(user.password)
    .then((hash) => {
      user.password = hash;
    })
    .catch((err) => `Error hashing password: ${err}`);
};

const bookshelf = require("bookshelf")(db);

const User = bookshelf.model(
  "User",
  {
    initialize() {
      this.constructor.__super__.initialize.apply(this, arguments);

      this.on("creating", this.validateSave);
      this.on("updating", this.validateUpdate);
    },
    tableName: "users",
    validateUpdate(model, attrs) {
      if (model.password !== attrs) return beforeSave(this.attributes);

      return this.attributes;
    },
    validateSave() {
      return beforeSave(this.attributes);
    },
  },
  {
    verify(username, password) {
      if (!username || !password) {
        throw new Error("username and password are both required");
      }
      return new this({ username }).fetch().then(function (user) {
        return verifyPassword(password, user.get("password")).then(
          (isMatch) => {
            if (!isMatch) throw new Error("invalid password");

            return user.toJSON();
          }
        );
      });
    },
  }
);

export default User;
