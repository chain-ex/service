import { Router } from "express";
import AuthController from "./auth_controller";

const router = Router();

router.route("/login").post(AuthController.login);

router.route("/register").post(AuthController.register);

router.route("/verify").post(AuthController.verify);

router.route("/forgot").post(AuthController.forgot);

router.route("/reset").post(AuthController.changePassword);

router.route("/check").post(AuthController.checkToken);

export default router;
