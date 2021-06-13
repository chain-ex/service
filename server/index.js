import bodyParser from "body-parser";
import cors from "cors";
import morgan from "morgan";
import config from "../config";

// Audit Service
import AuditService from "./services/audit_service";

// Service Routes
import ServiceRouter from "./services";

// Middleware
import errorMiddleware from "./middleware/error_middleware";
import authMiddleware from "./middleware/auth_middleware";

// Config
const { apiVersion, version, CODE, env } = config;
const apiRoute = `/${apiVersion}`;

const express = require("express");
const swaggerDocRouter = require("./docs/swagger/router");

// Server
const app = express();
app.use(
  cors({
    credentials: true,
    origin: true,
  })
);

app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Audit
app.use(`/version`, (req, res) => {
  res.status(CODE.OK).json({
    data: {
      env,
      version,
    },
  });
});

// Audit
app.use(apiRoute, AuditService.scanRequest);

// Authorization
app.use(apiRoute, authMiddleware);

app.use("/doc", swaggerDocRouter);

app.use(apiRoute, ServiceRouter.privateServiceRoutes);
app.use("/", ServiceRouter.publicServiceRoutes);

// Error Middleware should be at the botton of the index.js
app.use(errorMiddleware);
// Don't add any routing after this
export default app;
