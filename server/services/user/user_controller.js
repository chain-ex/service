import crudRoutes from "../../helpers/crud_routes";
import UserModel from "../../models/user";

import config from "../../../config";

const { CODE } = config;

const CrudRoutes = crudRoutes(UserModel);

function meFunc(req, res, next) {
  const currentUserID = req.userData.uid;

  UserModel.findOne({
    id: currentUserID,
  })
    .then((user) => {
      res.statusCode = CODE.OK;
      res.send({
        message: "Current User",
        data: user,
      });
    })
    .catch((err) => {
      res.statusCode = CODE.ERR;
      next(err);
    });
}

export default {
  ...CrudRoutes,
  meFunc,
};
