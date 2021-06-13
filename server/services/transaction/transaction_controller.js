import crudRoutes from "../../helpers/crud_routes";
import TransactionModel from "../../models/transaction";
import ContractModel from "../../models/contract";
// import config from "../../../config";

// const { CODE } = config;

const CrudRoutes = crudRoutes(TransactionModel, {
  getFunc: {
    initialFilters: (findQuery, req) => {
      const currentUserID = Number(req.userData.uid);
      findQuery.where({
        user_id: currentUserID,
      });
    },
  },
  getManyFunc: {
    initialFilters: async (findQuery, req) => {
      const currentUserID = Number(req.userData.uid);
      const { networkID, shortID } = req.query;

      if (networkID) {
        const contracts = await ContractModel.find({
          filters: {
            network_id: parseInt(networkID, 10),
            owner_id: currentUserID,
          },
          selectableFields: ["short_id"],
          pageSize: 9999999,
        });
        const contractShortIDs = contracts.map((value) => value.short_id);
        findQuery.whereIn("short_id", contractShortIDs);
      }

      if (shortID) {
        findQuery.andWhere("short_id", shortID);
      }

      findQuery.where({
        user_id: currentUserID,
      });
    },
  },
});

export default {
  ...CrudRoutes,
};
