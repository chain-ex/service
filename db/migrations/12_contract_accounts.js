exports.up = (knex) => {
  return knex.schema.createTable("contract_accounts", (table) => {
    table.increments("id");
    table.string("name", 150).notNullable();
    table.string("address", 250).notNullable();
    table.string("private_key", 250).notNullable();

    table.boolean("is_active").defaultTo(true).notNullable();

    // Foreign Keys
    table.string("short_id").notNullable();

    table.timestamps(true, true);
  });
};

exports.down = (knex) => {
  return knex.schema.dropTable("contract_accounts");
};
