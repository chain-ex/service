import { Router } from "express";
import IntegrationController from "./integration_controller";

const router = Router();

router
  .route("/stats/")
  .get(IntegrationController.integrationRequestFuncs.stats);

router
  .route("/requests/")
  .get(IntegrationController.integrationRequestFuncs.getManyFunc);

router
  .route("/requests/:id")
  .get(IntegrationController.integrationRequestFuncs.getFunc);

router.route("/:shortID/:method").post(IntegrationController.send);

router.route("/:shortID/:method").get(IntegrationController.call);

router.route("/:shortID/:tag/:method").post(IntegrationController.sendWithTag);
router.route("/:shortID/:tag/:method").get(IntegrationController.callWithTag);

export default router;
