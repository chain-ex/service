import config from "./config";
import db from "./db";
import server from "./server";

require('yargs') // eslint-disable-line
  .command("serve", "start the server", () => {
    // Server Port
    server.set("PORT", process.env.PORT || config.serverPort || 3000);

    // Server
    server.listen(server.get("PORT"), () =>
      console.log(`Server running on port ${server.get("PORT")}`)
    );
  })
  .command(
    "migrate",
    "migrate the database",
    () => {},
    async (argv) => {
      try {
        await db.migrate.rollback();
        await db.migrate.latest();

        if (argv.seed) {
          await db.seed.run();
          console.log("Seed Inserted");
        }
        console.log("Migrate Completed");
        process.exit(0);
      } catch (err) {
        console.error(err);
      }
    }
  )
  .option("seed", {
    alias: "s",
    type: "boolean",
    describe: "migrate with default data",
  })
  .command("env", "get current node envorinment", () => {
    console.log(config.env);
  })
  .help("h").argv;
