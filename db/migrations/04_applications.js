exports.up = (knex) => {
  return knex.schema.createTable("applications", (table) => {
    table.increments("id");
    table.string("name", 150).notNullable();
    table.string("description", 250).notNullable();
    table.boolean("is_deleted").defaultTo(false).notNullable();

    // Foreign Keys
    table.integer("network_id").unsigned().notNullable();
    table.integer("owner_id").unsigned().notNullable().references("users.id");

    // Foreign References
    table.foreign("network_id").references("networks");

    table.timestamps(true, true);
  });
};

exports.down = (knex) => {
  return knex.schema.dropTable("applications");
};
