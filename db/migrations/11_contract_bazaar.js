exports.up = (knex) => {
  return knex.schema.createTable("contract_bazaar", (table) => {
    table.increments("id");
    table.text("abi").notNullable();
    table.text("bytecode").notNullable();
    table.text("metadata").notNullable();
    table.string("name").notNullable();
    table.boolean("is_public").defaultTo(true).notNullable();
    table.string("description").notNullable();
    table.string("bazaar_version").notNullable();

    // Foreign Keys
    table.integer("owner_id").unsigned().notNullable();

    // Foreign References
    table.foreign("owner_id").references("users");

    table.timestamps(true, true);
  });
};

exports.down = (knex) => {
  return knex.schema.dropTable("contract_bazaar");
};
