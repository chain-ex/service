import crudRoutes from "../../helpers/crud_routes";
import ApplicationModel from "../../models/application";
import config from "../../../config";

const { CODE } = config;

const CrudRoutes = crudRoutes(ApplicationModel, {
  postFunc: {
    validateFilters: (props, req, res) => {
      const currentUserID = req.userData.uid;
      const currentNetworkID = req.params.networkID;
      // eslint-disable-next-line no-restricted-globals
      if (!isNaN(currentNetworkID) && !isNaN(currentUserID)) {
        // eslint-disable-next-line no-param-reassign
        props.owner_id = Number(currentUserID);
        // eslint-disable-next-line no-param-reassign
        props.network_id = Number(currentNetworkID);
        return undefined;
      }
      res.statusCode = CODE.ERR;
      return new Error("Invalid parameters");
    },
  },
  getFunc: {
    initialFilters: (findQuery, req) => {
      const currentUserID = Number(req.userData.uid);
      const { networkID } = req.params;
      findQuery.where({
        owner_id: currentUserID,
        network_id: networkID,
      });
    },
  },
  getManyFunc: {
    initialFilters: (findQuery, req) => {
      const currentUserID = Number(req.userData.uid);
      const { networkID } = req.params;
      findQuery.where({
        owner_id: currentUserID,
        network_id: networkID,
      });
    },
  },
  deleteFunc: {
    validateFilters: (findQuery, req) => {
      const currentUserID = req.userData.uid;
      findQuery.where("owner_id", currentUserID);
    },
  },
  putFunc: {
    validateFilters: (updateQuery, req) => {
      const currentUserID = req.userData.uid;

      updateQuery.where({ owner_id: currentUserID });
    },
  },
});

export default {
  ...CrudRoutes,
};
