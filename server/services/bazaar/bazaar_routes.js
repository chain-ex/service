import { Router } from "express";
import fileUpload from "express-fileupload";
import BazaarController from "./bazaar_controller";

const router = Router();

router.use(fileUpload());

router
  .route("/")
  .get(BazaarController.getBazaarFunc)
  .post(BazaarController.postFunc);
router
  .route("/:id")
  .get(BazaarController.getBazaarWithIDFunc)
  .post(BazaarController.deployFromMarketFunc);

export default router;
