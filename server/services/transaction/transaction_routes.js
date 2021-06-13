import { Router } from "express";
import TransactionController from "./transaction_controller";

const router = Router();

router.route("/").get(TransactionController.getManyFunc);

router.route("/:hash").get(TransactionController.getFunc);

export default router;
