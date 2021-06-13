import { Router } from "express";
import fileUpload from "express-fileupload";
import ContractController from "./contract_controller";

const router = Router();

router.use(fileUpload());

router
  .route("/:networkID/contract")
  .get(ContractController.getManyFunc)
  .post(ContractController.deployFunc);

router
  .route("/:networkID/contract/:shortID")
  .get(ContractController.getLatestVersionFunc)
  .put(ContractController.updateLatestVersionFunc)
  .delete(ContractController.deleteLatestVersionFunc);

router
  .route("/:networkID/contract/:shortID/version")
  .post(ContractController.deployNewVersionFunc)
  .get(ContractController.getAllVersionsFunc);

router
  .route("/:networkID/contract/:shortID/version/:tag")
  .get(ContractController.getContractWithTagFunc)
  .put(ContractController.updateContractWithTagFunc)
  .delete(ContractController.deleteContractWithTagFunc);

router
  .route("/contract/:shortID/account/")
  .get(ContractController.contractAccount.getManyFunc)
  .post(ContractController.contractAccount.postFunc);

router
  .route("/contract/:shortID/account/:id")
  .get(ContractController.contractAccount.getFunc)
  .put(ContractController.contractAccount.putFunc)
  .delete(ContractController.contractAccount.deleteFunc);

export default router;
