exports.up = (knex) => {
  return knex.schema.createTable("contract_version", (table) => {
    table.increments("id");
    table.string("name", 150).notNullable();
    table.string("description", 250).notNullable();
    table.string("tag").defaultTo("v1.0").notNullable();
    // Contract Spec
    table.json("abi").notNullable();
    table.json("args");
    table.text("bytecode").notNullable();
    table.text("metadata").notNullable();
    table.string("hash", 64).notNullable();
    table.string("contract_address", 250).notNullable();

    // Unique
    table.unique("hash");

    // Foreign Keys
    table.string("short_id", 150).notNullable();
    // Foreign references
    table.foreign("short_id").references("contracts");
    table.timestamps(true, true);
  });
};

exports.down = (knex) => {
  return knex.schema.dropTable("contract_version");
};
