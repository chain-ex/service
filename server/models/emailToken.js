import crudController from "../helpers/crud";

const name = "EmailToken";
const tableName = "email_tokens";
const searchField = "token";
const searchParam = "token";

const selectableProps = [
  "id",
  "token",
  "is_used",
  "expired_in",
  "type",
  "user_id",
  "updated_at",
  "created_at",
];

const cruds = crudController({
  name,
  searchField,
  tableName,
  selectableProps,
  searchParam,
});

export default {
  ...cruds,
};
