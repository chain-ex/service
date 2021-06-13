import ContractModel from "../models/contract";

function checkContractOwner(UserID, shortID) {
  return ContractModel.where({ owner_id: UserID, short_id: shortID }).fetch();
}

export default checkContractOwner;
