exports.up = (knex) => {
  return knex.schema.createTable("application_users", (table) => {
    // Foreign Keys
    table
      .integer("application_id")
      .unsigned()
      .notNullable()
      .references("applications.id");

    table.integer("user_id").unsigned().notNullable().references("users.id");

    // Foreign References
    table.foreign("application_id");
    table.foreign("user_id");

    table.timestamps(true, true);
  });
};

exports.down = (knex) => {
  return knex.schema.dropTable("application_users");
};
