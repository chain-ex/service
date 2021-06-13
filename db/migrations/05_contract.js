exports.up = (knex) => {
  return knex.schema.createTable("contracts", (table) => {
    table.increments("id");
    table.string("name", 150).notNullable();
    table.string("description", 250).notNullable();
    table.boolean("is_deleted").defaultTo(false).notNullable();

    table.string("short_id", 150).notNullable();
    table.string("owner_address", 250).notNullable();
    table.string("owner_privatekey", 250).notNullable();

    // Foreign Keys
    table.integer("application_id").unsigned().notNullable();
    table.integer("network_id").unsigned().notNullable();
    table.integer("owner_id").unsigned().notNullable();

    // Foreign References
    table.foreign("application_id").references("application");
    table.foreign("network_id").references("networks");
    table.foreign("owner_id").references("users");

    table.timestamps(true, true);
  });
};

exports.down = (knex) => {
  return knex.schema.dropTable("contracts");
};
