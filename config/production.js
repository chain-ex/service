import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({
  path: path.resolve(__dirname, `${process.env.NODE_ENV}.env`),
});
export default {
  serverPort: process.env.SERVER_PORT,
  baseURL: process.env.BASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET,
    options: { expiresIn: "1h", issuer: "TubuArge" },
  },
  dbConfig: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
  },
  cacheConfig: {
    host: process.env.CACHE_HOST,
    port: process.env.CACHE_PORT,
  },
  log: {
    debug: true,
    errorFile: true,
  },
};
