exports.up = (knex) => {
  return knex.schema.createTable("networks", (table) => {
    table.increments("id");
    table.string("name", 150).notNullable();
    table.string("bctype", 150).notNullable();
    table.string("version", 50).notNullable();
    table.string("consensus", 50).notNullable();
    table.string("ip_address", 100).notNullable();
    table.integer("ws_port").unsigned().notNullable();
    table.boolean("is_public").defaultTo(false).notNullable();

    // Foreign Keys
    table.integer("owner_id").unsigned().notNullable();

    // Foreign References
    table.foreign("owner_id").references("users");

    table.timestamps(true, true);
  });
};

exports.down = (knex) => {
  return knex.schema.dropTable("networks");
};
