import { Router } from "express";
import UserController from "./user_controller";

const router = Router();

router.route("/").get(UserController.getManyFunc).post(UserController.postFunc);

router.route("/me").get(UserController.meFunc);

router
  .route("/:username")
  .get(UserController.getFunc)
  .put(UserController.putFunc)
  .delete(UserController.deleteFunc);

export default router;
