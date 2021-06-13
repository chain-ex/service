exports.up = (knex) => {
  return knex.schema.createTable("audits", (table) => {
    table.increments("id");
    table.string("url", 150).notNullable();
    table.string("method", 250).notNullable();
    table.string("user_agent", 250).notNullable();
    table.string("ip_address", 250).notNullable();
    table.integer("status").notNullable();
    table.json("body");
    table.json("query");
    // Foreign Keys
    table.integer("user_id").unsigned().notNullable();

    // Foreign References
    table.foreign("user_id").references("users");

    table.timestamps(true, true);
  });
};

exports.down = (knex) => {
  return knex.schema.dropTable("audits");
};
