import { Router } from "express";
import WebhookController from "./webhook_controller";

const router = Router();

router
  .route("/")
  .get(WebhookController.getManyFunc)
  .post(WebhookController.postFunc);

router
  .route("/:id")
  .get(WebhookController.getFunc)
  .put(WebhookController.putFunc)
  .delete(WebhookController.deleteFunc);

router.route("/:id/log").get(WebhookController.webhookLogRoutes.getManyFunc);

router.route("/:id/log/:logID").get(WebhookController.webhookLogRoutes.getFunc);

export default router;
