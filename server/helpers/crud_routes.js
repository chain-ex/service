import config from "../../config";

const { CODE } = config;

const postFunc = (model, { validateFilters } = {}) => {
  return async (req, res, next) => {
    const props = req.body;

    if (typeof validateFilters === "function") {
      const err = await validateFilters(props, req, res);
      if (err) {
        res.statusCode = res.statusCode === CODE.OK ? CODE.ERR : res.statusCode;
        next(err);
        return;
      }
    }

    model
      .create(props)
      .then((returnData) => {
        res.statusCode = CODE.CREATED;
        res.json({
          message: `${model.name} created`,
          data: returnData[0],
        });
      })
      .catch((err) => {
        res.statusCode = CODE.ERR;
        next(err);
      });
  };
};

const getManyFunc = (model, { initialFilters } = {}) => {
  return async (req, res, next) => {
    const { page = 1, pageSize = 20, filters = {} } = req.query;

    const findQuery = model.find({ filters, page, pageSize });
    const countQuery = model.count(filters);

    if (typeof initialFilters === "function") {
      try {
        await initialFilters(findQuery, req);
        await initialFilters(countQuery, req);
      } catch (err) {
        res.statusCode = CODE.ERR;
        next(err);
        return;
      }
    }

    findQuery
      .then((data) => {
        countQuery.then(([{ count }]) => {
          const totalCount = Number(count);
          res.statusCode = CODE.OK;
          res.json({
            message: `${model.name} listed`,
            meta: {
              totalCount,
              totalPage: Math.ceil(totalCount / pageSize),
              page,
            },
            data: model.jsonConverter(data),
          });
        });
      })
      .catch((err) => {
        res.statusCode = CODE.ERR;
        next(err);
      });
  };
};

const getFunc = (model, { initialFilters, extendDataFunc } = {}) => {
  return (req, res, next) => {
    const filters = {};

    const searchParam = req.params[model.searchParam];

    if (
      (typeof searchParam === "string" && searchParam.startsWith("0x")) ||
      // eslint-disable-next-line no-restricted-globals
      isNaN(searchParam)
    ) {
      filters[model.searchField] = req.params[model.searchParam];
    } else {
      filters[model.searchField] = Number(req.params[model.searchParam]);
    }

    const findQuery = model.find({ filters, selectableFields: ["*"] });

    if (typeof initialFilters === "function") {
      initialFilters(findQuery, req);
    }

    findQuery
      .then(([data]) => {
        if (!data) {
          res.statusCode = CODE.NOT_FOUND;
          next(new Error("Not Found"));
          return;
        }
        if (typeof extendDataFunc === "function") {
          extendDataFunc(data)
            .then((newData) => {
              res.statusCode = CODE.OK;
              res.json({
                message: `${model.name} found`,
                data: model.jsonConverter(newData),
              });
            })
            .catch((err) => {
              res.statusCode = CODE.ERR;
              next(err);
            });
        } else {
          res.statusCode = CODE.OK;
          res.json({
            message: `${model.name} found`,
            data: model.jsonConverter(data),
          });
        }
      })
      .catch((err) => {
        res.statusCode = CODE.ERR;
        next(err);
      });
  };
};

const putFunc = (model, { validateFilters } = {}) => {
  return (req, res, next) => {
    const id = req.params[model.searchParam];

    const props = req.body;

    const updateQuery = model.updateOne(id, props);

    if (typeof validateFilters === "function") {
      validateFilters(updateQuery, req);
    }

    updateQuery
      .then((updatedData) => {
        if (updatedData.length === 0) {
          throw new Error("No data updated");
        }
        res.statusCode = CODE.OK;
        res.json({
          message: `${model.name} with ${id} id updated`,
          data: updatedData[0],
        });
      })
      .catch((err) => {
        res.statusCode = CODE.ERR;
        next(err);
      });
  };
};

const deleteFunc = (model, { validateFilters } = {}) => {
  return (req, res, next) => {
    const id = req.params[model.searchParam];

    const removeQuery = model.remove(id);

    if (typeof validateFilters === "function") {
      validateFilters(removeQuery, req);
    }

    removeQuery
      .then((rowCount) => {
        if (rowCount >= 1) {
          res.statusCode = CODE.OK_NO_DATA;
          res.json();
        } else {
          throw new Error("No Data Deleted");
        }
      })
      .catch((err) => {
        res.statusCode = CODE.ERR;
        next(err);
      });
  };
};

export default (model, options = {}) => {
  return {
    postFunc: postFunc(model, options.postFunc),
    getFunc: getFunc(model, options.getFunc),
    getManyFunc: getManyFunc(model, options.getManyFunc),
    putFunc: putFunc(model, options.putFunc),
    deleteFunc: deleteFunc(model, options.deleteFunc),
  };
};
