import crudRoutes from "../../helpers/crud_routes";
import NetworkModel from "../../models/network";
import config from "../../../config";

const { CODE } = config;

const CrudRoutes = crudRoutes(NetworkModel, {
  postFunc: {
    validateFilters: (props, req, res) => {
      const currentUserID = req.userData.uid;
      if (Number(currentUserID) !== props.owner_id) {
        res.statusCode = CODE.UNAUTHORIZED;
        return new Error("Invalid User");
      }
      return undefined;
    },
  },
  getManyFunc: {
    initialFilters: (findQuery, req) => {
      const currentUserID = Number(req.userData.uid);
      findQuery.where(function () {
        this.where({ owner_id: currentUserID }).orWhere({
          is_public: true,
        });
      });
    },
  },
  getFunc: {
    initialFilters: (findQuery, req) => {
      const currentUserID = Number(req.userData.uid);
      findQuery.where(function () {
        this.where({ owner_id: currentUserID }).orWhere({
          is_public: true,
        });
      });
    },
    extendDataFunc: (data) => {
      return NetworkModel.getWeb3(data).then(async (web3) => {
        const blockCount = await web3.eth.getBlockNumber();
        const chainId = await web3.eth.getChainId();
        const nodeInfo = await web3.eth.getNodeInfo();
        return {
          ...data,
          chain: {
            blockCount,
            chainId,
            nodeInfo,
          },
        };
      });
    },
  },
  deleteFunc: {
    validateFilters: (removeQuery, req) => {
      const currentUserID = req.userData.uid;
      removeQuery.where("owner_id", currentUserID);
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
