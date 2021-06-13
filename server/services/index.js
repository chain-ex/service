// Authorization Routes
import AuthRoutes from "./auth/auth_routes";
import IntegrationRoutes from "./integration_service";

// Model Routes
import UserRoutes from "./user_service";
import NetworkRoutes from "./network_service";
import ApplicationRoutes from "./application_service";
import ContractRoutes from "./contract_service";
import RequestRoutes from "./request_service";
import TransactionRoutes from "./transaction_service";
import WebhookRoutes from "./webhook_service";
import BazaarRoutes from "./bazaar_service";
import SharingRoutes from "./share_service";
import ApiKeyRoutes from "./api_key_service";

const express = require("express");

const publicServiceRoutes = express.Router();
const privateServiceRoutes = express.Router();

// Public Routes
publicServiceRoutes.use("/auth", AuthRoutes);
publicServiceRoutes.use("/int", IntegrationRoutes);

// Private Routes
privateServiceRoutes.use("/user", UserRoutes);
privateServiceRoutes.use("/network", NetworkRoutes);
privateServiceRoutes.use("/network", ApplicationRoutes);
privateServiceRoutes.use("/network", ContractRoutes);
privateServiceRoutes.use("/integration/", RequestRoutes);
privateServiceRoutes.use("/webhook/", WebhookRoutes);
privateServiceRoutes.use("/transactions", TransactionRoutes);
privateServiceRoutes.use("/market", BazaarRoutes);
privateServiceRoutes.use("/sharing", SharingRoutes);
privateServiceRoutes.use("/apikey", ApiKeyRoutes);

export default {
  publicServiceRoutes,
  privateServiceRoutes,
};
