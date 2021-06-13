exports.up = (knex) => {
  return knex.schema.createTable("api_keys", (table) => {
    table.increments("id");
    table.string("token", 255).notNullable();
    table.integer("application_id", 255).notNullable();

    // Index
    table.index(["token"]);

    // Foreign Keys
    table.integer("created_by").unsigned().notNullable();

    // Foreign References
    table.foreign("created_by").references("users");

    table.timestamps(true, true);
  });
};

exports.down = (knex) => {
  return knex.schema.dropTable("api_keys");
};
