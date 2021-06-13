exports.up = (knex) => {
  return knex.schema.createTable("transactions", (table) => {
    table.increments("id");
    table.string("short_id").notNullable();
    table.string("from_address").notNullable();
    table.string("hash").notNullable();
    table.json("input");
    table
      .enum("status", ["pending", "success", "failed"])
      .defaultTo("pending")
      .notNullable();
    table.string("to_address").notNullable();
    table.string("block_hash");
    table.integer("block_number");
    table.json("extra_data");
    table.timestamps(true, true);
  });
};

exports.down = (knex) => {
  return knex.schema.dropTable("transactions");
};
