exports.up = (knex) => {
  return knex.schema.createTable("webhooks", (table) => {
    table.increments("id");
    table.string("name", 150).notNullable();
    table.string("description", 250).notNullable();

    table.string("url", 150).notNullable();
    table.json("authorization");

    // Foreign Keys
    table.string("short_id").notNullable();

    table.timestamps(true, true);
  });
};

exports.down = (knex) => {
  return knex.schema.dropTable("webhooks");
};
