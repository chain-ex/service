import db from "./db";
import cache from "./db/cache";

// eslint-disable-next-line import/no-extraneous-dependencies
const knexjscleaner = require("knex-cleaner");

// const allTables = ["users"];

// function truncateAllTables() {
//   const dbPromises = [];
//   for (const tableName of allTables) {
//     dbPromises.push(db.table(tableName).truncate());
//   }
//   return Promise.all(dbPromises);
// }

const knesjsCleanerOpts = {
  mode: "truncate", // Valid options 'truncate', 'delete'
  restartIdentity: true, // Used to tell PostgresSQL to reset the ID counter
  ignoreTables: ["migrations", "migrations_lock"],
};

beforeAll(async (done) => {
  await db.migrate
    .latest()
    .then(() => {
      done();
    })
    .catch((reason) => {
      done(reason);
    });
});

beforeEach(async (done) => {
  await knexjscleaner.clean(db, knesjsCleanerOpts);
  cache.internalCache.flushAll();
  done();
});

afterAll(async (done) => {
  await db.migrate
    .rollback()
    .then(() => db.destroy())
    .catch(done);

  done();
});
