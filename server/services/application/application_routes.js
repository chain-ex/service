import { Router } from "express";
import ApplicationController from "./application_controller";

const router = Router();

router
  .route("/:networkID/apps")
  .get(ApplicationController.getManyFunc)
  .post(ApplicationController.postFunc);

router
  .route("/:networkID/apps/:id")
  .get(ApplicationController.getFunc)
  .put(ApplicationController.putFunc)
  .delete(ApplicationController.deleteFunc);

export default router;
