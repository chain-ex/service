import db from "../../db";

// _cr_ no exception handling specified!!!
// _cr_ please put at least one row in every function definition
module.exports = ({
  name = "name",
  tableName = "tablename",
  selectableProps = [],
  searchField = "id",
  idField = "id",
  beforeSave,
  searchParam,
  jsonFields = [],
}) => {
  const timeout = 2000;
  searchParam = searchParam || searchField;

  function jsonConverter(row) {
    if (!row) return row;

    try {
      for (const field of jsonFields) {
        if (row[field] && typeof row[field] === "string") {
          row[field] = JSON.parse(row[field]);
        }
      }
    } catch (err) {
      console.error(err);
    }
    return row;
  }

  const create = async (props) => {
    let newProps = props;
    if (typeof beforeSave === "function") {
      newProps = await beforeSave(props);
    }

    delete newProps[idField]; // not allowed to set idField

    return db
      .insert(newProps)
      .returning(selectableProps)
      .into(tableName)
      .timeout(timeout);
  };
  // _cr_ please add here another function to fetch all like 'all'
  // _cr_ 2 please call 'find' function inside here
  const findAll = ({ filters = {} } = {}) => {
    return db
      .select(selectableProps)
      .from(tableName)
      .where(filters)
      .timeout(timeout);
  };

  const count = (filters = {}) => {
    return db.from(tableName).where(filters).count(idField).timeout(timeout);
  };

  const find = ({
    filters = {},
    page = 1,
    pageSize = 20,
    selectableFields,
  }) => {
    if (typeof filters === "function") {
      return filters
        .apply(db.select(selectableFields || selectableProps).from(tableName))
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .timeout(timeout);
    }
    return db
      .select(selectableFields || selectableProps)
      .from(tableName)
      .where(filters)
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .timeout(timeout);
  };

  // Same as `find` but only returns the first match if >1 are found.
  const findOne = (filters, selectableFields) =>
    find({ filters, selectableFields }).then((results) => {
      if (!Array.isArray(results)) return results;
      return jsonConverter(results[0]);
    });

  const findById = (id) => {
    const whereId = {};
    whereId[searchField] = id;
    return findOne(whereId);
  };

  const update = (filters = {}, props) => {
    const newProps = { ...props };

    delete newProps[idField]; // not allowed to set `idField`

    return db
      .update(props)
      .from(tableName)
      .where(filters)
      .returning(selectableProps)
      .timeout(timeout);
  };

  const updateOne = (id, props) => {
    const newProps = props;
    const whereId = {};

    if (typeof id === "string" && id.startsWith("0x")) {
      whereId[searchField] = id;
      // eslint-disable-next-line no-restricted-globals
    } else if (isNaN(id)) {
      whereId[searchField] = id;
    } else {
      whereId[searchField] = parseInt(id, 10);
    }

    delete newProps[idField]; // not allowed to set `idField`

    return db
      .update(props)
      .from(tableName)
      .where(whereId)
      .returning(selectableProps)
      .timeout(timeout);
  };

  // _cr_2 what if delete operation throws an exception, foreign key, primary key etc???
  const remove = (id) => {
    const whereId = {};
    if (id.startsWith("0x")) {
      whereId[searchField] = id;
      // eslint-disable-next-line no-restricted-globals
    } else if (isNaN(id)) {
      whereId[searchField] = id;
    } else {
      whereId[searchField] = parseInt(id, 10);
    }

    return db.del().from(tableName).where(whereId).timeout(timeout);
  };

  const getTable = () => {
    return db(tableName);
  };

  return {
    name,
    idField,
    updateOne,
    tableName,
    getTable,
    selectableProps,
    searchField,
    searchParam,
    jsonConverter,
    timeout,
    create,
    findAll,
    find,
    count,
    findOne,
    findById,
    update,
    remove,
  };
};
