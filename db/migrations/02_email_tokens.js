exports.up = (knex) => {
  return knex.schema.createTable("email_tokens", (table) => {
    table.increments("id");
    table.string("token", 255).notNullable();
    table.boolean("is_used").defaultTo(false).notNullable();
    table.string("expired_in", 255).notNullable();

    table.enum("type", ["forgot", "verification"]).notNullable();

    // Index
    table.index(["token"]);

    // Foreign Keys
    table.integer("user_id").unsigned().notNullable();

    // Foreign References
    table.foreign("user_id").references("users");

    table.timestamps(true, true);
  });
};

exports.down = (knex) => {
  return knex.schema.dropTable("email_tokens");
};
