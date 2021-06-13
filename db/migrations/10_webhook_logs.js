exports.up = (knex) => {
  return knex.schema.createTable("webhook_logs", (table) => {
    table.increments("id");

    table.string("url", 150).notNullable();
    table.jsonb("authorization");

    table.jsonb("request").notNullable();
    table.jsonb("response");
    table.jsonb("response_headers");
    table.integer("status");

    table.dateTime("request_at").notNullable();
    table.dateTime("response_at");

    // Foreign Keys
    table.string("short_id").notNullable();
    table.integer("webhook_id").notNullable();
  });
};

exports.down = (knex) => {
  return knex.schema.dropTable("webhook_logs");
};
