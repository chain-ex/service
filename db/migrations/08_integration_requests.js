exports.up = (knex) => {
  return knex.schema.createTable("integration_requests", (table) => {
    table.increments("id");
    table.string("short_id").notNullable();
    table.enum("type", ["call", "send"]).notNullable();
    table.string("method").notNullable();
    table.jsonb("inputs").defaultTo([]).notNullable();
    table.jsonb("outputs").defaultTo([]).notNullable();
    table.boolean("status").default(false).notNullable();
    table.timestamps(true, true);
  });
};

exports.down = (knex) => {
  return knex.schema.dropTable("integration_requests");
};
