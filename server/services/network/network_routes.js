import { Router } from "express";
import NetworkController from "./network_controller";

const router = Router();

router
  .route("/")
  .get(NetworkController.getManyFunc)
  .post(NetworkController.postFunc);

router
  .route("/:networkID")
  .get(NetworkController.getFunc)
  .put(NetworkController.putFunc)
  .delete(NetworkController.deleteFunc);

export default router;
